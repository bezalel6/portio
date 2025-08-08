import React, {useEffect, useState} from 'react';
import {Box, Text, useApp, useInput} from 'ink';
import {getProcessOnPort, killProcess} from '../utils/portDetector.js';
import {Logo} from './Logo.js';

interface Props {
	port: number;
	force?: boolean;
}

export const KillMode: React.FC<Props> = ({port, force = false}) => {
	const {exit} = useApp();
	const [loading, setLoading] = useState(true);
	const [process, setProcess] = useState<any>(null);
	const [error, setError] = useState<string | null>(null);
	const [waitingForConfirm, setWaitingForConfirm] = useState(false);
	const [killing, setKilling] = useState(false);
	const [result, setResult] = useState<string | null>(null);

	useEffect(() => {
		const checkPort = async () => {
			try {
				const proc = await getProcessOnPort(port);
				setProcess(proc);
				setLoading(false);
				
				if (proc && force) {
					await performKill(proc.pid);
				} else if (proc) {
					setWaitingForConfirm(true);
				} else {
					setTimeout(() => exit(), 100);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Unknown error');
				setLoading(false);
				setTimeout(() => exit(), 100);
			}
		};

		checkPort();
	}, [port, force]);

	const performKill = async (pid: number) => {
		setKilling(true);
		setWaitingForConfirm(false);
		
		try {
			const success = await killProcess(pid);
			if (success) {
				setResult(`✓ Successfully killed process ${pid} on port ${port}`);
			} else {
				setResult(`✗ Failed to kill process ${pid}. Try running with elevated privileges.`);
			}
		} catch (err) {
			setResult(`✗ Error killing process: ${err instanceof Error ? err.message : 'Unknown error'}`);
		} finally {
			setKilling(false);
			setTimeout(() => exit(), 1000);
		}
	};

	useInput((input, key) => {
		if (!waitingForConfirm) return;

		if (input === 'y' || input === 'Y') {
			if (process) {
				performKill(process.pid);
			}
		} else if (input === 'n' || input === 'N' || key.escape) {
			setResult('Kill cancelled');
			setTimeout(() => exit(), 100);
		}
	});

	if (loading) {
		return (
			<Box flexDirection="column">
				<Logo />
				<Box>
					<Text color="yellow">Checking port {port}...</Text>
				</Box>
			</Box>
		);
	}

	if (error) {
		return (
			<Box flexDirection="column">
				<Logo />
				<Text color="red">Error checking port {port}:</Text>
				<Text color="red">{error}</Text>
			</Box>
		);
	}

	if (!process) {
		return (
			<Box flexDirection="column">
				<Logo />
				<Box>
					<Text color="green">Port {port} is already free!</Text>
				</Box>
			</Box>
		);
	}

	if (killing) {
		return (
			<Box flexDirection="column">
				<Logo />
				<Box>
					<Text color="yellow">Killing process {process.pid}...</Text>
				</Box>
			</Box>
		);
	}

	if (result) {
		return (
			<Box flexDirection="column">
				<Logo />
				<Box>
					<Text color={result.startsWith('✓') ? 'green' : result === 'Kill cancelled' ? 'yellow' : 'red'}>
						{result}
					</Text>
				</Box>
			</Box>
		);
	}

	if (waitingForConfirm) {
		return (
			<Box flexDirection="column">
				<Logo />
				<Text color="cyan" bold>Process found on port {port}:</Text>
				<Box marginTop={1} flexDirection="column">
					<Text>
						<Text color="yellow">PID: </Text>
						<Text>{process.pid}</Text>
					</Text>
					<Text>
						<Text color="yellow">Process: </Text>
						<Text>{process.processName || 'Unknown'}</Text>
					</Text>
					<Text>
						<Text color="yellow">Command: </Text>
						<Text>{process.command || 'N/A'}</Text>
					</Text>
				</Box>
				<Box marginTop={1}>
					<Text color="red" bold>
						Kill this process? (y/n): 
					</Text>
				</Box>
			</Box>
		);
	}

	return null;
};