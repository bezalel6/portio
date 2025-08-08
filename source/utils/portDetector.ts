import {exec} from 'child_process';
import {promisify} from 'util';
import os from 'os';

const execAsync = promisify(exec);

export interface ProcessInfo {
	pid: number;
	port: number;
	processName: string;
	command: string;
	fullCommand?: string;
}

const DEV_PORTS = [
	3000, 3001, 3002, 3003, 3004, 3005,
	4000, 4001, 4200, 4201,
	5000, 5001, 5173, 5174, 5175,
	8000, 8001, 8080, 8081, 8082, 8083,
	8888, 9000, 9001, 9200, 9229,
	19000, 19001, 19002
];

export function isDevPort(port: number): boolean {
	return DEV_PORTS.includes(port);
}


async function getPortsWindows(): Promise<ProcessInfo[]> {
	try {
		const {stdout} = await execAsync('netstat -ano');
		const lines = stdout.split('\n');
		const processes: ProcessInfo[] = [];
		const seenPorts = new Set<string>();

		for (const line of lines) {
			if (line.includes('LISTENING')) {
				const parts = line.trim().split(/\s+/);
				if (parts.length >= 5) {
					const localAddress = parts[1];
					const pidStr = parts[4];
					
					if (!localAddress || !pidStr) continue;
					const pid = parseInt(pidStr, 10);
					if (isNaN(pid)) continue;
					
					const portMatch = localAddress.match(/:(\d+)$/);
					if (portMatch && portMatch[1]) {
						const port = parseInt(portMatch[1], 10);
						const key = `${port}-${pid}`;
						
						if (!seenPorts.has(key)) {
							seenPorts.add(key);
							processes.push({
								pid,
								port,
								processName: '',
								command: ''
							});
						}
					}
				}
			}
		}

		// Batch query all PIDs at once for better performance
		if (processes.length > 0) {
			const pids = processes.map(p => p.pid);
			// Create a filter string like: (ProcessId=123 or ProcessId=456 or ProcessId=789)
			const pidFilter = pids.map(pid => `ProcessId=${pid}`).join(' or ');
			
			try {
				const {stdout: taskInfo} = await execAsync(`wmic process where "(${pidFilter})" get ProcessId,Name,CommandLine /format:list`);
				
				// Parse WMIC output - it comes in blocks separated by blank lines
				const lines = taskInfo.split(/\r?\n/);
				let currentPid = 0;
				let currentName = '';
				let currentCmdLine = '';
				
				for (const line of lines) {
					const trimmedLine = line.trim();
					
					if (trimmedLine.startsWith('ProcessId=')) {
						// If we have a previous process data, save it before starting new one
						if (currentPid > 0) {
							const process = processes.find(p => p.pid === currentPid);
							if (process) {
								process.processName = currentName || 'Unknown';
								process.fullCommand = currentCmdLine;
								process.command = extractCommand(currentCmdLine);
							}
						}
						currentPid = parseInt(trimmedLine.replace('ProcessId=', '').trim(), 10);
						currentName = '';
						currentCmdLine = '';
					} else if (trimmedLine.startsWith('Name=')) {
						currentName = trimmedLine.replace('Name=', '').trim();
					} else if (trimmedLine.startsWith('CommandLine=')) {
						currentCmdLine = trimmedLine.replace('CommandLine=', '').trim();
					}
				}
				
				// Don't forget the last process
				if (currentPid > 0) {
					const process = processes.find(p => p.pid === currentPid);
					if (process) {
						process.processName = currentName || 'Unknown';
						process.fullCommand = currentCmdLine;
						process.command = extractCommand(currentCmdLine);
					}
				}
			} catch (error) {
				// Fallback to individual queries if batch fails
				for (const process of processes) {
					try {
						const {stdout: taskInfo} = await execAsync(`wmic process where ProcessId=${process.pid} get Name,CommandLine /format:list`);
						const lines = taskInfo.split('\n');
						
						for (const line of lines) {
							if (line.startsWith('Name=')) {
								process.processName = line.replace('Name=', '').trim();
							} else if (line.startsWith('CommandLine=')) {
								const cmdLine = line.replace('CommandLine=', '').trim();
								process.fullCommand = cmdLine;
								process.command = extractCommand(cmdLine);
							}
						}
					} catch {
						process.processName = 'Unknown';
						process.command = '';
					}
				}
			}
		}

		return processes;
	} catch (error) {
		console.error('Error getting Windows ports:', error);
		return [];
	}
}

async function getPortsUnix(): Promise<ProcessInfo[]> {
	try {
		const command = os.platform() === 'darwin'
			? 'lsof -iTCP -sTCP:LISTEN -n -P'
			: 'ss -ltnp';
		
		const {stdout} = await execAsync(command);
		const lines = stdout.split('\n');
		const processes: ProcessInfo[] = [];
		const seenPorts = new Set<string>();

		if (os.platform() === 'darwin') {
			for (const line of lines.slice(1)) {
				const parts = line.trim().split(/\s+/);
				if (parts.length >= 9) {
					const pidStr = parts[1];
					const addressPart = parts[8];
					
					if (!pidStr || !addressPart) continue;
					const pid = parseInt(pidStr, 10);
					
					if (isNaN(pid)) continue;
					
					const portMatch = addressPart.match(/:(\d+)$/);
					if (portMatch && portMatch[1]) {
						const port = parseInt(portMatch[1], 10);
						const key = `${port}-${pid}`;
						
						if (!seenPorts.has(key)) {
							seenPorts.add(key);
							const processName = parts[0] || 'Unknown';
							processes.push({
								pid,
								port,
								processName: processName || 'Unknown',
								command: await getCommandFromPid(pid)
							});
						}
					}
				}
			}
		} else {
			for (const line of lines.slice(1)) {
				const parts = line.trim().split(/\s+/);
				if (parts.length >= 4) {
					const addressPart = parts[3];
					const processPart = parts[6];
					
					if (!addressPart || !processPart) continue;
					
					const portMatch = addressPart.match(/:(\d+)$/);
					const pidMatch = processPart.match(/pid=(\d+)/);
					
					if (portMatch && portMatch[1] && pidMatch && pidMatch[1]) {
						const port = parseInt(portMatch[1], 10);
						const pid = parseInt(pidMatch[1], 10);
						const key = `${port}-${pid}`;
						
						if (!seenPorts.has(key)) {
							seenPorts.add(key);
							const processMatch = processPart.match(/"([^"]+)"/);
							const processName = processMatch ? processMatch[1] : undefined;
							
							processes.push({
								pid,
								port,
								processName: processName || 'Unknown',
								command: await getCommandFromPid(pid)
							});
						}
					}
				}
			}
		}

		return processes;
	} catch (error) {
		console.error('Error getting Unix ports:', error);
		return [];
	}
}

async function getCommandFromPid(pid: number): Promise<string> {
	try {
		const {stdout} = await execAsync(`ps -p ${pid} -o command=`);
		const fullCommand = stdout.trim();
		return extractCommand(fullCommand);
	} catch {
		return '';
	}
}

function extractCommand(fullCommand: string): string {
	if (!fullCommand) return '';
	
	const patterns = [
		/\b(next|nuxt|vite|webpack|nodemon|ts-node|node|npm|yarn|pnpm|bun|deno)\b/i,
		/\b(react|vue|angular|svelte|gatsby|remix|astro)\b/i,
		/\b(express|fastify|koa|hapi|nest|strapi)\b/i,
		/\b(dev|start|serve|watch|run)\b/i
	];
	
	for (const pattern of patterns) {
		const match = fullCommand.match(pattern);
		if (match) {
			const context = fullCommand.substring(
				Math.max(0, fullCommand.indexOf(match[0]) - 20),
				Math.min(fullCommand.length, fullCommand.indexOf(match[0]) + match[0].length + 30)
			);
			return context.replace(/\s+/g, ' ').trim();
		}
	}
	
	const parts = fullCommand.split(/\s+/);
	const relevantParts = parts.slice(0, 3).join(' ');
	return relevantParts.substring(0, 50);
}

export async function getProcessesOnPorts(showAll = true): Promise<ProcessInfo[]> {  // Default to showing all ports
	const platform = os.platform();
	let processes: ProcessInfo[];
	
	if (platform === 'win32') {
		processes = await getPortsWindows();
	} else {
		processes = await getPortsUnix();
	}
	
	if (!showAll) {
		processes = processes.filter(p => isDevPort(p.port));
	}
	
	return processes.sort((a, b) => a.port - b.port);
}

export async function getProcessOnPort(port: number): Promise<ProcessInfo | null> {
	const processes = await getProcessesOnPorts(true);
	return processes.find(p => p.port === port) || null;
}

export async function killProcess(pid: number): Promise<boolean> {
	try {
		const command = os.platform() === 'win32'
			? `taskkill /F /PID ${pid}`
			: `kill -9 ${pid}`;
		
		await execAsync(command);
		return true;
	} catch {
		return false;
	}
}


export async function checkProcessExists(pid: number): Promise<boolean> {
	try {
		if (os.platform() === 'win32') {
			const {stdout} = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV`);
			// If process exists, tasklist will return it, otherwise it returns "INFO: No tasks are running..."
			return !stdout.includes('INFO:') && stdout.includes(pid.toString());
		} else {
			// For Unix, check if process exists
			const {stdout} = await execAsync(`ps -p ${pid} -o pid=`);
			return stdout.trim() === pid.toString();
		}
	} catch {
		return false;
	}
}

export async function killProcessElevated(pid: number, processName: string): Promise<void> {
	if (os.platform() !== 'win32') {
		// For Unix systems, use sudo
		const command = `sudo kill -9 ${pid}`;
		exec(command, (error) => {
			if (error) {
				console.error('Failed to kill process with sudo:', error);
			}
		});
		return;
	}
	
	// For Windows, create a simpler PowerShell script since result will show in TUI
	const psScript = `
		$Host.UI.RawUI.WindowTitle = 'PORTY - Admin Kill'
		Write-Host 'PORTY - Killing process with admin privileges...' -ForegroundColor Yellow
		Write-Host ''
		Write-Host 'Process: ${processName} (PID: ${pid})' -ForegroundColor Cyan
		Write-Host ''
		taskkill /F /PID ${pid}
		Write-Host ''
		Write-Host 'Command executed. Check PORTY for result.' -ForegroundColor Green
		Start-Sleep -Seconds 1
	`.replace(/\n\t\t/g, '\n').trim();
	
	// Encode the script as base64 to avoid escaping issues
	const encodedScript = Buffer.from(psScript, 'utf16le').toString('base64');
	
	// Create the command to launch elevated PowerShell with the encoded script
	const psCommand = `Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', '${encodedScript}'`;
	
	try {
		// Launch PowerShell with the elevated command
		exec(`powershell -Command "${psCommand}"`, (error) => {
			if (error && error.code !== 1) { // Code 1 is normal for UAC cancel
				console.error('Failed to launch elevated prompt:', error);
			}
		});
	} catch (error) {
		console.error('Error launching elevated terminal:', error);
	}
}

