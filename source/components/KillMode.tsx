import React, {useEffect, useState} from 'react';
import {Box, Text, useApp, useInput} from 'ink';
import {getProcessOnPort, killProcess} from '../utils/portDetector.js';
// Logo removed for concise output

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
	}, {isActive: !force});

	if (loading) {
		return (
			<Text color="yellow">Checking port {port}...</Text>
		);
	}

	if (error) {
		return (
			<Text color="red">Error: {error}</Text>
		);
	}

	if (!process) {
		return (
			<Text color="green">✓ Port {port} is already free</Text>
		);
	}

	if (killing) {
		return (
			<Text color="yellow">Killing process {process.pid}...</Text>
		);
	}

	if (result) {
		return (
			<Text color={result.startsWith('✓') ? 'green' : result === 'Kill cancelled' ? 'yellow' : 'red'}>
				{result}
			</Text>
		);
	}

	if (waitingForConfirm) {
		return (
			<Box flexDirection="column">
				<Text>{process.processName || 'Unknown'} (PID: {process.pid}) on port {port}</Text>
				<Text color="red">Kill this process? (y/n): </Text>
			</Box>
		);
	}

	return null;
};