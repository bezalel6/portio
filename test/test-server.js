#!/usr/bin/env node

const http = require('http');
const net = require('net');
const { spawn } = require('child_process');

// Simple color codes for terminal output (no dependencies)
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
};

const color = (clr, text) => `${colors[clr]}${text}${colors.reset}`;
const bold = (clr, text) => `${colors.bright}${colors[clr]}${text}${colors.reset}`;

// Parse command line arguments
const args = process.argv.slice(2);
const port = parseInt(args[0]) || 3456;
const elevated = args.includes('--elevated') || args.includes('-e');
const protocol = args.includes('--tcp') ? 'tcp' : 'http';

// If elevated flag is set and we're on Windows, relaunch with admin
if (elevated && process.platform === 'win32' && !args.includes('--relaunched')) {
    console.log(color('yellow', '🔒 Relaunching with elevated privileges...'));
    
    // Create PowerShell command to run this script elevated
    const scriptPath = process.argv[1];
    const nodeExe = process.execPath;
    const newArgs = [...args, '--relaunched'];
    
    const psCommand = `
        Start-Process -Verb RunAs -FilePath "${nodeExe}" -ArgumentList "${scriptPath}", "${newArgs.join('", "')}" -WindowStyle Normal
    `.trim();
    
    spawn('powershell', ['-Command', psCommand], {
        shell: true,
        detached: true,
        stdio: 'ignore'
    });
    
    console.log(color('gray', 'Check the elevated window for the test server.'));
    process.exit(0);
}

// Create server based on protocol
function createServer() {
    console.log(bold('cyan', `\n🧪 PORTY TEST SERVER`));
    console.log(color('gray', '─'.repeat(40)));
    
    if (protocol === 'tcp') {
        // Create a simple TCP server
        const server = net.createServer((socket) => {
            socket.write('PORTY Test TCP Server\r\n');
            socket.on('data', (data) => {
                socket.write(`Echo: ${data}`);
            });
        });
        
        server.listen(port, '0.0.0.0', () => {
            displayServerInfo('TCP', port);
        });
        
        server.on('error', handleError);
        
    } else {
        // Create HTTP server
        const server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <html>
                <head>
                    <title>PORTY Test Server</title>
                    <style>
                        body { 
                            font-family: monospace; 
                            background: #1a1a1a; 
                            color: #4ECDC4; 
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                        }
                        .container {
                            text-align: center;
                            padding: 40px;
                            border: 2px solid #4ECDC4;
                            border-radius: 10px;
                        }
                        h1 { color: #FFE66D; }
                        .info { color: #95E77E; margin: 20px 0; }
                        .pid { color: #A78BFA; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>⚡ PORTY Test Server</h1>
                        <div class="info">
                            <p>Port: <strong>${port}</strong></p>
                            <p>PID: <span class="pid">${process.pid}</span></p>
                            <p>Elevated: ${elevated ? '🔒 Yes' : '❌ No'}</p>
                            <p>Time: ${new Date().toLocaleTimeString()}</p>
                        </div>
                        <p>Use PORTY to find and kill this process!</p>
                    </div>
                </body>
                </html>
            `);
        });
        
        server.listen(port, '0.0.0.0', () => {
            displayServerInfo('HTTP', port);
        });
        
        server.on('error', handleError);
    }
}

function displayServerInfo(type, port) {
    console.log(color('green', `✅ ${type} Server Started`));
    console.log(color('gray', '─'.repeat(40)));
    console.log('Port:      ' + bold('cyan', port));
    console.log('PID:       ' + bold('magenta', process.pid));
    console.log('Elevated:  ' + (elevated ? bold('red', '🔒 Yes (Admin)') : color('green', 'No')));
    console.log('Protocol:  ' + color('yellow', type));
    
    if (type === 'HTTP') {
        console.log('URL:       ' + color('cyan', `http://localhost:${port}`));
    }
    
    console.log(color('gray', '─'.repeat(40)));
    console.log(color('gray', '\nPress Ctrl+C to stop the server'));
    console.log(color('yellow', '\n💡 Now use PORTY to find and kill this process:'));
    console.log(color('gray', '   $ node dist/cli.js'));
    console.log(color('gray', `   Then look for port ${port}\n`));
}

function handleError(err) {
    if (err.code === 'EADDRINUSE') {
        console.error(color('red', `❌ Port ${port} is already in use!`));
        console.error(color('yellow', 'Try a different port or use PORTY to kill the existing process.'));
    } else if (err.code === 'EACCES') {
        console.error(color('red', `❌ Permission denied for port ${port}!`));
        if (port < 1024) {
            console.error(color('yellow', 'Ports below 1024 require admin privileges.'));
            console.error(color('gray', 'Try: node test/test-server.js ' + port + ' --elevated'));
        }
    } else {
        console.error(color('red', '❌ Server error:'), err.message);
    }
    process.exit(1);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log(color('yellow', '\n\n👋 Shutting down test server...'));
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log(color('yellow', '\n\n💀 Killed by external process!'));
    process.exit(0);
});

// Start the server
createServer();