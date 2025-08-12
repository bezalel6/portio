import React, {useState, useEffect, useMemo} from 'react';
import {Box, Text, useApp, useInput, useStdout} from 'ink';
import TextInput from 'ink-text-input';
import chalk from 'chalk';
import {ProcessInfo, getProcessesOnPorts, killProcess, killProcessElevated, checkProcessExists} from '../utils/portDetector.js';
import {ProcessTable} from './ProcessTable.js';
import {Logo} from './Logo.js';
const APP_VERSION = '2.0.0';

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
	const [showFullPaths, setShowFullPaths] = useState(false);
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState('');
	const [confirmKill, setConfirmKill] = useState<number | null>(null);
	const [failedKillPid, setFailedKillPid] = useState<number | null>(null);
	const [checkingAdminKill, setCheckingAdminKill] = useState(false);
	const [scrollOffset, setScrollOffset] = useState(0);
	const [selectedPids, setSelectedPids] = useState<Set<number>>(new Set());

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
				if (confirmKill === -999) {
					// Multi-kill
					handleMultiKill();
				} else {
					handleKillProcess(confirmKill);
				}
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

		if (input === 'p') {
			setShowFullPaths(!showFullPaths);
			setMessage(showFullPaths ? 'Showing filenames only' : 'Showing full paths');
			return;
		}

		// Spacebar toggles selection
		if (input === ' ' && filteredProcesses.length > 0) {
			const process = filteredProcesses[selectedIndex];
			if (process) {
				const newSelected = new Set(selectedPids);
				if (newSelected.has(process.pid)) {
					newSelected.delete(process.pid);
					setMessage(`Deselected ${process.processName} (PID: ${process.pid})`);
				} else {
					newSelected.add(process.pid);
					setMessage(`Selected ${process.processName} (PID: ${process.pid})`);
				}
				setSelectedPids(newSelected);
			}
			return;
		}

		// Kill multiple selected or single
		if (input === 'k' && selectedPids.size > 0) {
			setMessage(`⚠️ Kill ${selectedPids.size} selected processes? Press ${chalk.green('Enter')} to confirm or ${chalk.red('ESC')} to cancel`);
			setConfirmKill(-999); // Special value for multi-kill
			return;
		}

		if (key.upArrow) {
			setSelectedIndex(Math.max(0, selectedIndex - 1));
		}

		if (key.downArrow) {
			setSelectedIndex(Math.min(filteredProcesses.length - 1, selectedIndex + 1));
		}

		if (key.return && filteredProcesses.length > 0) {
			// If we have selected items, kill them all
			if (selectedPids.size > 0) {
				handleMultiKill();
			} else {
				// Single kill for current row
				const process = filteredProcesses[selectedIndex];
				if (process) {
					setConfirmKill(process.pid);
					setMessage(`⚠️ Kill ${chalk.yellow(process.processName)} (PID: ${process.pid}) on port ${chalk.cyan(process.port)}? Press ${chalk.green('Enter')} to confirm or ${chalk.red('ESC')} to cancel`);
				}
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
			setMessage(`❌ Failed to kill ${process?.processName || `process ${pid}`}. Press ${chalk.yellow.bold('A')} to try with admin privileges or run portio as admin.`);
		}
	};

	const handleMultiKill = async () => {
		if (selectedPids.size === 0) return;
		
		setMessage(`Killing ${selectedPids.size} processes...`);
		let successCount = 0;
		let failedPids: number[] = [];
		
		for (const pid of selectedPids) {
			const success = await killProcess(pid);
			if (success) {
				successCount++;
			} else {
				failedPids.push(pid);
			}
		}
		
		if (failedPids.length === 0) {
			setMessage(`✅ Successfully killed ${successCount} processes`);
			setSelectedPids(new Set());
		} else {
			setMessage(`⚠️ Killed ${successCount} processes, ${failedPids.length} failed (may need admin)`);
		}
		
		setTimeout(() => loadProcesses(), 500);
	};

	// Only render visible rows based on viewport
	const visibleProcesses = useMemo(() => {
		return filteredProcesses.slice(scrollOffset, scrollOffset + maxVisibleRows);
	}, [filteredProcesses, scrollOffset, maxVisibleRows]);

	// Check if selected row has command overflow
	const selectedOverflow = useMemo(() => {
		if (selectedIndex >= 0 && selectedIndex < filteredProcesses.length) {
			const proc = filteredProcesses[selectedIndex];
			if (!proc) return null;
			
			let commandDisplay;
			if (!proc.command || proc.command.trim() === '') {
				return null; // NONE doesn't need overflow
			} else if (showFullPaths) {
				// Always show full command in overflow when in full path mode
				commandDisplay = proc.fullCommand || proc.command;
				return commandDisplay; // Always show full path, no length check
			} else {
				commandDisplay = verboseMode ? (proc.fullCommand || proc.command) : proc.command;
				// Only show overflow for simplified view if it's long
				if (commandDisplay && commandDisplay.length > 40) {
					return commandDisplay;
				}
			}
		}
		return null;
	}, [selectedIndex, filteredProcesses, verboseMode, showFullPaths]);

	const tableData = visibleProcesses.map((proc, actualIndex) => {
		const index = actualIndex + scrollOffset;
		const isSelected = index === selectedIndex;
		
		// Enhanced color scheme with gradients
		const isDevPort = proc.port >= 3000 && proc.port < 10000;
		const isSystemPort = proc.port < 1024;
		const isHighPort = proc.port >= 49152;
		
		// Process command path
		let commandDisplay;
		if (!proc.command || proc.command.trim() === '') {
			commandDisplay = 'NONE';
		} else if (showFullPaths) {
			// Show full command path and arguments
			commandDisplay = proc.fullCommand || proc.command;
		} else {
			// Show simplified command
			commandDisplay = verboseMode ? (proc.fullCommand || proc.command) : proc.command;
			// Extract filename from path
			const match = commandDisplay.match(/([^\\\/]+)(?:\.[^.]+)?(?:\s|$)/);
			if (match) {
				commandDisplay = match[0];
			}
		}
		
		// Add checkbox to process number
		const isChecked = selectedPids.has(proc.pid);
		const checkbox = isChecked ? '[×]' : '[ ]';
		const processNum = `${checkbox} ${(index + 1).toString()}`;
		
		if (isSelected) {
			// Vibrant selection with background
			// For selected rows, pass raw command for scrolling animation
			// ProcessTable will handle the scrolling
			if (commandDisplay === 'NONE') {
				return {
					'#': chalk.bgCyan.black(` ${processNum.padEnd(7)} `),
					'PID': chalk.bgCyan.black(` ${proc.pid.toString().padEnd(6)} `),
					'Port': chalk.bgCyan.black.bold(` ${proc.port.toString().padEnd(5)} `),
					'Process': chalk.bgCyan.black(` ${(proc.processName || 'Unknown').padEnd(15)} `),
					'Command': chalk.hex('#6B7280').italic('NONE'),
					'__rawCommand': 'NONE',  // Pass raw for scrolling
					'__isSelected': 'true'  // Flag for ProcessTable
				};
			} else {
				return {
					'#': chalk.bgCyan.black(` ${processNum.padEnd(7)} `),
					'PID': chalk.bgCyan.black(` ${proc.pid.toString().padEnd(6)} `),
					'Port': chalk.bgCyan.black.bold(` ${proc.port.toString().padEnd(5)} `),
					'Process': chalk.bgCyan.black(` ${(proc.processName || 'Unknown').padEnd(15)} `),
					'Command': commandDisplay,  // Raw text for scrolling
					'__rawCommand': commandDisplay,  // Also store raw
					'__isSelected': 'true'  // Flag for ProcessTable (as string)
				};
			}
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
		
		// Style commands based on display mode
		const commandColor = commandDisplay === 'NONE' 
			? chalk.hex('#6B7280').italic  // Dimmed gray italic for NONE
			: showFullPaths 
				? chalk.white  // Full bright white for full paths
				: chalk.hex('#94A3B8');  // Slate gray for simplified commands
		
		// Color the checkbox based on selection
		const checkboxColored = isChecked 
			? chalk.green(checkbox)  // Green when checked
			: chalk.gray(checkbox);   // Gray when not checked
			
		return {
			'#': checkboxColored + ' ' + chalk.gray((index + 1).toString()),
			'PID': chalk.hex('#A78BFA')(proc.pid.toString()), // Purple for PIDs
			'Port': portColor.bold(proc.port.toString()),
			'Process': processColor(processName),
			'Command': commandColor(commandDisplay),
			'__rawCommand': commandDisplay,  // Pass raw for potential scrolling
			'__isSelected': ''  // Empty string for non-selected
		};
	});

	return (
		<Box flexDirection="column">
			<Logo />
			<Box marginBottom={1}>
				<Text bold>{chalk.hex('#4ECDC4')('⚡ PORTIO')}</Text>
				<Text color="gray"> - Port Process Manager </Text>
				<Text color="magenta">v{APP_VERSION}</Text>
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
						<Box marginTop={1} paddingX={1} flexDirection="column">
							{selectedOverflow ? (
								<Box>
									<Text color="cyan" dimColor>Cmd: </Text>
									<Text color="gray">{selectedOverflow.length > 70 ? selectedOverflow.substring(0, 67) + '...' : selectedOverflow}</Text>
								</Box>
							) : (
								<Box flexDirection="column">
									<Text color="gray">
										{chalk.cyan.bold('↑↓')} nav  
										{chalk.green.bold(' ␣')} select  
										{selectedPids.size > 0 ? chalk.red.bold(' k') : chalk.red.bold(' ⏎')} kill  
										{chalk.yellow.bold(' /')} search  
										{chalk.green.bold(' r')} refresh  
										{chalk.magenta.bold(' d')} dev/all  
										{chalk.blue.bold(' v')} verbose  
										{chalk.hex('#FFB86C').bold(' p')} paths  
										{chalk.gray.bold(' q')} quit
										{selectedPids.size > 0 && chalk.yellow(` (${selectedPids.size} selected)`)}
									</Text>
									<Box justifyContent="flex-end" marginTop={0}>
										<Text color="gray" dimColor italic>
											made by RNDev
										</Text>
									</Box>
								</Box>
							)}
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