import React, {useState, useEffect, useMemo} from 'react';
import {Box, Text, useApp, useInput, useStdout} from 'ink';
import TextInput from 'ink-text-input';
import chalk from 'chalk';
import {ProcessInfo, getProcessesOnPorts, killProcess, killProcessElevated, checkProcessExists} from '../utils/portDetector.js';
import {ProcessTable} from './ProcessTable.js';
import {Logo} from './Logo.js';

interface Props {
	initialShowAll?: boolean;
}

export const InteractiveUI: React.FC<Props> = ({initialShowAll = true}) => {  // Default to showing all ports
	const {exit} = useApp();
	const {stdout} = useStdout();
	const [processes, setProcesses] = useState<ProcessInfo[]>([]);
	const [filteredProcesses, setFilteredProcesses] = useState<ProcessInfo[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [filterQuery, setFilterQuery] = useState('');
	const [isFiltering, setIsFiltering] = useState(false);
	const [showAll, setShowAll] = useState(initialShowAll);
	const [verboseMode, setVerboseMode] = useState(false);
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState('');
	const [confirmKill, setConfirmKill] = useState<number | null>(null);
	const [failedKillPid, setFailedKillPid] = useState<number | null>(null);
	const [checkingAdminKill, setCheckingAdminKill] = useState(false);
	const [scrollOffset, setScrollOffset] = useState(0);

	// Calculate viewport height - reserve space for header, controls, and messages
	const HEADER_LINES = 10; // Logo + title + mode/filter + controls
	const FOOTER_LINES = 4; // Messages and controls
	const maxVisibleRows = Math.max(5, Math.min(15, (stdout?.rows || 30) - HEADER_LINES - FOOTER_LINES));

	const loadProcesses = async () => {
		setLoading(true);
		const procs = await getProcessesOnPorts(showAll);
		setProcesses(procs);
		setFilteredProcesses(procs);
		setLoading(false);
		setMessage('');
	};

	useEffect(() => {
		loadProcesses();
	}, [showAll]);

	useEffect(() => {
		if (filterQuery) {
			const filtered = processes.filter(p => 
				p.port.toString().includes(filterQuery) ||
				p.pid.toString().includes(filterQuery) ||
				p.processName.toLowerCase().includes(filterQuery.toLowerCase()) ||
				p.command.toLowerCase().includes(filterQuery.toLowerCase())
			);
			setFilteredProcesses(filtered);
			setSelectedIndex(0);
			setScrollOffset(0);
		} else {
			setFilteredProcesses(processes);
		}
	}, [filterQuery, processes]);

	// Adjust scroll offset when selection moves outside viewport
	useEffect(() => {
		if (selectedIndex < scrollOffset) {
			setScrollOffset(selectedIndex);
		} else if (selectedIndex >= scrollOffset + maxVisibleRows) {
			setScrollOffset(selectedIndex - maxVisibleRows + 1);
		}
	}, [selectedIndex, maxVisibleRows]);

	useInput((input, key) => {
		// Handle admin kill attempt
		if (failedKillPid !== null) {
			if (input === 'A' || input === 'a') {
				const process = filteredProcesses.find(p => p.pid === failedKillPid);
				if (process) {
					setMessage(`🚀 Launching elevated terminal... Approve the UAC prompt to kill ${process.processName}`);
					setCheckingAdminKill(true);
					killProcessElevated(process.pid, process.processName);
					
					// Wait a moment for the UAC prompt and execution
					setTimeout(() => {
						setMessage(`⏳ Checking if ${process.processName} was terminated...`);
					}, 1500);
					
					// Check after delay to see if it worked
					setTimeout(async () => {
						const stillExists = await checkProcessExists(process.pid);
						setCheckingAdminKill(false);
						
						if (!stillExists) {
							setMessage(`✅ Admin kill successful! ${process.processName} (PID: ${process.pid}) has been terminated.`);
							loadProcesses();
						} else {
							setMessage(`❌ Admin kill failed. ${process.processName} may be protected by the system or you cancelled the UAC prompt.`);
						}
					}, 3000);
					
					setFailedKillPid(null);
				}
				return;
			} else if (key.escape) {
				setFailedKillPid(null);
				setMessage('');
				return;
			}
		}
		
		if (confirmKill !== null) {
			if (key.return) {
				handleKillProcess(confirmKill);
				setConfirmKill(null);
			} else if (key.escape) {
				setConfirmKill(null);
				setMessage('Kill cancelled');
			}
			return;
		}

		if (isFiltering) {
			if (key.escape) {
				setIsFiltering(false);
				setFilterQuery('');
			} else if (key.return) {
				setIsFiltering(false);
			}
			return;
		}

		if (input === 'q' || (key.ctrl && input === 'c')) {
			exit();
		}

		if (input === '/') {
			setIsFiltering(true);
			return;
		}

		if (input === 'c') {
			setFilterQuery('');
			setMessage('Filter cleared');
			return;
		}

		if (input === 'r') {
			setMessage('Refreshing...');
			loadProcesses();
			return;
		}

		if (input === 'd') {
			setShowAll(!showAll);
			setMessage(showAll ? 'Showing dev ports only' : 'Showing all ports');
			return;
		}

		if (input === 'v') {
			setVerboseMode(!verboseMode);
			setMessage(verboseMode ? 'Verbose mode off' : 'Verbose mode on');
			return;
		}

		if (key.upArrow) {
			setSelectedIndex(Math.max(0, selectedIndex - 1));
		}

		if (key.downArrow) {
			setSelectedIndex(Math.min(filteredProcesses.length - 1, selectedIndex + 1));
		}

		if (key.return && filteredProcesses.length > 0) {
			const process = filteredProcesses[selectedIndex];
			if (process) {
				setConfirmKill(process.pid);
				setMessage(`⚠️ Kill ${chalk.yellow(process.processName)} (PID: ${process.pid}) on port ${chalk.cyan(process.port)}? Press ${chalk.green('Enter')} to confirm or ${chalk.red('ESC')} to cancel`);
			}
		}
	});

	const handleKillProcess = async (pid: number) => {
		const success = await killProcess(pid);
		const process = filteredProcesses.find(p => p.pid === pid);
		
		if (success) {
			setMessage(`✅ Successfully killed ${process?.processName || `process ${pid}`}`);
			setFailedKillPid(null);
			setTimeout(() => loadProcesses(), 500);
		} else {
			setFailedKillPid(pid);
			setMessage(`❌ Failed to kill ${process?.processName || `process ${pid}`}. Press ${chalk.yellow.bold('A')} to try with admin privileges or run porty as admin.`);
		}
	};

	// Only render visible rows based on viewport
	const visibleProcesses = useMemo(() => {
		return filteredProcesses.slice(scrollOffset, scrollOffset + maxVisibleRows);
	}, [filteredProcesses, scrollOffset, maxVisibleRows]);

	const tableData = visibleProcesses.map((proc, actualIndex) => {
		const index = actualIndex + scrollOffset;
		const isSelected = index === selectedIndex;
		
		// Enhanced color scheme with gradients
		const isDevPort = proc.port >= 3000 && proc.port < 10000;
		const isSystemPort = proc.port < 1024;
		const isHighPort = proc.port >= 49152;
		
		if (isSelected) {
			// Vibrant selection with background
			return {
				'#': chalk.bgCyan.black(` ${(index + 1).toString().padEnd(3)} `),
				'PID': chalk.bgCyan.black(` ${proc.pid.toString().padEnd(6)} `),
				'Port': chalk.bgCyan.black.bold(` ${proc.port.toString().padEnd(5)} `),
				'Process': chalk.bgCyan.black(` ${(proc.processName || 'Unknown').padEnd(15)} `),
				'Command': chalk.bgCyan.black(` ${verboseMode ? (proc.fullCommand || proc.command) : proc.command} `)
			};
		}
		
		// Color-coded by port type with better visibility
		let portColor;
		if (isSystemPort) {
			portColor = chalk.hex('#FF6B6B'); // Coral red for system ports
		} else if (isDevPort) {
			portColor = chalk.hex('#4ECDC4'); // Teal for dev ports
		} else if (isHighPort) {
			portColor = chalk.hex('#95E77E'); // Light green for ephemeral
		} else {
			portColor = chalk.hex('#FFE66D'); // Yellow for registered ports
		}
		
		// Process name coloring based on type
		let processColor = chalk.white;
		const processLower = proc.processName?.toLowerCase() || '';
		if (processLower.includes('node') || processLower.includes('npm')) {
			processColor = chalk.hex('#68D391'); // Node green
		} else if (processLower.includes('python')) {
			processColor = chalk.hex('#4B8BBE'); // Python blue
		} else if (processLower.includes('java')) {
			processColor = chalk.hex('#F89820'); // Java orange
		} else if (processLower.includes('docker')) {
			processColor = chalk.hex('#2496ED'); // Docker blue
		}
		
		const processName = proc.processName || 'Unknown';
		
		return {
			'#': chalk.gray((index + 1).toString()),
			'PID': chalk.hex('#A78BFA')(proc.pid.toString()), // Purple for PIDs
			'Port': portColor.bold(proc.port.toString()),
			'Process': processColor(processName),
			'Command': chalk.hex('#94A3B8')(verboseMode ? (proc.fullCommand || proc.command) : proc.command) // Slate gray
		};
	});

	return (
		<Box flexDirection="column">
			<Logo />
			<Box marginBottom={1}>
				<Text bold>{chalk.hex('#4ECDC4')('⚡ PORTY')}</Text>
				<Text color="gray"> - Port Process Manager </Text>
				<Text color="magenta">v1.0</Text>
			</Box>

			{loading ? (
				<Box>
					<Text color="cyan">⟳ Scanning ports...</Text>
				</Box>
			) : (
				<>
					{isFiltering ? (
						<Box marginBottom={1}>
							<Text color="yellow">🔍 </Text>
							<TextInput
								value={filterQuery}
								onChange={setFilterQuery}
								placeholder="Search..."
							/>
						</Box>
					) : (
						<Box marginBottom={1}>
							<Text color="gray">Mode: </Text>
							<Text color={showAll ? 'magenta' : 'cyan'} bold>
								{showAll ? '● All Ports' : '● Dev Only'}
							</Text>
							<Text color="gray"> │ Found: </Text>
							<Text color="yellow" bold>{filteredProcesses.length}</Text>
							<Text color="gray"> processes</Text>
						</Box>
					)}

					{filteredProcesses.length > 0 ? (
						<>
							<ProcessTable data={tableData} selectedIndex={selectedIndex - scrollOffset} />
							{filteredProcesses.length > maxVisibleRows && (
								<Box marginTop={0} paddingX={1}>
									<Text color="gray" dimColor>
										{`[${scrollOffset + 1}-${Math.min(scrollOffset + maxVisibleRows, filteredProcesses.length)} of ${filteredProcesses.length}]`}
										{scrollOffset > 0 && ' ↑'}
										{scrollOffset + maxVisibleRows < filteredProcesses.length && ' ↓'}
									</Text>
								</Box>
							)}
						</>
					) : (
						<Box padding={1} borderStyle="round" borderColor="gray">
							<Text color="gray">
								{filterQuery 
									? `❌ No matches for "${chalk.yellow(filterQuery)}"`
									: '📭 No processes found on listening ports'}
							</Text>
						</Box>
					)}

					{message && (
						<Box marginTop={1} paddingX={1}>
							<Text>
								{message.includes('✅') || message.includes('❌') || message.includes('⚠️') || 
								 message.includes('🚀') || message.includes('⏳') ? message :  // Already formatted with emoji
								 message.includes('Success') ? chalk.green('✅ ' + message) : 
								 message.includes('Failed') ? chalk.red('❌ ' + message) :
								 message.includes('cancelled') ? chalk.yellow('↩️  ' + message) :
								 chalk.cyan('ℹ️  ' + message)}
							</Text>
						</Box>
					)}
					
					{checkingAdminKill && (
						<Box marginTop={1} paddingX={1}>
							<Text color="yellow">
								{chalk.yellow('⏳')} Waiting for admin action...
							</Text>
						</Box>
					)}

					{!isFiltering && !confirmKill && !failedKillPid && (
						<Box marginTop={1} paddingX={1}>
							<Text color="gray">
								{chalk.cyan.bold('↑↓')} nav  
								{chalk.red.bold(' ⏎')} kill  
								{chalk.yellow.bold(' /')} search  
								{chalk.green.bold(' r')} refresh  
								{chalk.magenta.bold(' d')} dev/all  
								{chalk.blue.bold(' v')} verbose  
								{chalk.gray.bold(' q')} quit
							</Text>
						</Box>
					)}
					
					{failedKillPid && !confirmKill && (
						<Box marginTop={1} paddingX={1} borderStyle="round" borderColor="red">
							<Text>
								{chalk.red.bold('⚠️  Admin Required: ')}
								{chalk.yellow.bold('A')} launch admin terminal  
								{chalk.gray.bold(' ESC')} cancel
							</Text>
						</Box>
					)}
					
					{confirmKill && (
						<Box marginTop={1} paddingX={1} borderStyle="round" borderColor="yellow">
							<Text>
								{chalk.yellow.bold('⚠️  Confirm Kill: ')}
								{chalk.green.bold('Enter')} to confirm  
								{chalk.red.bold(' ESC')} to cancel
							</Text>
						</Box>
					)}
				</>
			)}
		</Box>
	);
};