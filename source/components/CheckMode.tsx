import React, {useEffect, useState} from 'react';
import {Box, Text, useApp} from 'ink';
import chalk from 'chalk';
import {getProcessOnPort} from '../utils/portDetector.js';
import {Logo} from './Logo.js';

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
					<Text color="green">✓ Port {port} is free!</Text>
				</Box>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Logo />
			<Text color="cyan" bold>Port {port} is in use:</Text>
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
				{process.fullCommand && (
					<Box marginTop={1}>
						<Text dimColor>Full command: {process.fullCommand}</Text>
					</Box>
				)}
			</Box>
			<Box marginTop={1}>
				<Text dimColor>
					Tip: Use {chalk.cyan('porty --kill ' + port)} to free this port
				</Text>
			</Box>
		</Box>
	);
};