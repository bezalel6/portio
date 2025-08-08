# PORTY Test Server

A standalone test utility to create processes that occupy ports for testing PORTY's functionality.

## Quick Start

```bash
# Start a test server (default port 3456)
node test/test-server.js

# Start on specific port
node test/test-server.js 3000

# Start with admin privileges (Windows)
node test/test-server.js 3000 --elevated

# Start TCP server instead of HTTP
node test/test-server.js 5432 --tcp
```

## Usage

```bash
node test/test-server.js [port] [options]

Options:
  port          Port number to listen on (default: 3456)
  --elevated    Launch with administrator privileges (Windows)
  --tcp         Create a TCP server instead of HTTP
```

## Examples

### Test Normal Kill
```bash
# Terminal 1: Start test server
node test/test-server.js 3000

# Terminal 2: Use PORTY to find and kill
node dist/cli.js
# Navigate to port 3000, press Enter twice to kill
```

### Test Admin Kill
```bash
# Terminal 1: Start elevated test server
node test/test-server.js 3000 --elevated

# Terminal 2: Use PORTY
node dist/cli.js
# Try to kill - will fail and show "Press A for admin kill"
```

### Test System Ports
```bash
# Ports below 1024 need admin
node test/test-server.js 80 --elevated
node test/test-server.js 443 --elevated
```

### Test Multiple Servers
```bash
# Open multiple terminals and run:
node test/test-server.js 3000
node test/test-server.js 8080
node test/test-server.js 5000

# Then use PORTY to manage them all
```

## Features

- **No dependencies** - Uses only Node.js built-ins
- **HTTP/TCP servers** - Test different protocols
- **Auto-elevation** - Launches UAC prompt when --elevated is used
- **Visual feedback** - Colored terminal output shows status
- **Graceful shutdown** - Handles Ctrl+C and external kills

## Server Output

The test server shows:
- ✅ Server status
- 🔒 Elevation status (if running as admin)
- Port number and PID
- Protocol type (HTTP/TCP)
- URL for HTTP servers

## Troubleshooting

### "Port already in use"
- Use PORTY to find and kill the existing process
- Or choose a different port

### "Permission denied"
- For ports below 1024, use `--elevated` flag
- Example: `node test/test-server.js 80 --elevated`

### Windows UAC
- When using `--elevated`, approve the UAC prompt
- The server will open in a new elevated window

## Integration with PORTY

1. Start test servers to simulate real processes
2. Use PORTY to find them in the process list
3. Test normal kill (Enter → Enter)
4. Test admin kill (fails → Press A)
5. Verify the test server shows "Killed by external process!"