import React, {useEffect, useState} from 'react';
import {Box, Text, useApp} from 'ink';
import {getProcessOnPort} from '../utils/portDetector.js';
// Logo removed for concise output

interface Props {
	port: number;
}

export const CheckMode: React.FC<Props> = ({port}) => {
	const {exit} = useApp();
	const [loading, setLoading] = useState(true);
	const [process, setProcess] = useState<any>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const checkPort = async () => {
			try {
				const proc = await getProcessOnPort(port);
				setProcess(proc);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Unknown error');
			} finally {
				setLoading(false);
				setTimeout(() => exit(), 100);
			}
		};

		checkPort();
	}, [port, exit]);

	if (loading) {
		return (
			<Text color="yellow">Checking port {port}...</Text>
		);
	}

	if (error) {
		return (
			<Box flexDirection="column">
				<Text color="red">Error: {error}</Text>
			</Box>
		);
	}

	if (!process) {
		return (
			<Text color="green">✓ Port {port} is free</Text>
		);
	}

	return (
		<Box flexDirection="column">
			<Text>{process.processName || 'Unknown'} (PID: {process.pid})</Text>
			{process.command && process.command !== 'N/A' && (
				<Text dimColor>{process.command}</Text>
			)}
		</Box>
	);
};