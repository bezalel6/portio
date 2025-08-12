import React from 'react';
import {Box, Text} from 'ink';

interface LogoProps {
	showText?: boolean;
}

// Simple, static logo component without any image loading
const LogoComponent: React.FC<LogoProps> = ({showText = true}) => {
	if (!showText) {
		return null;
	}

	const asciiTitle = [
		'▌ PORTIO ▐',
	];

	return (
		<Box flexDirection="column" alignItems="center" marginBottom={1}>
			<Box flexDirection="column" alignItems="center">
				{asciiTitle.map((line, index) => (
					<Text key={index} color="cyan" bold>
						{line}
					</Text>
				))}
				<Box marginTop={0}>
					<Text color="gray" italic dimColor>
						port manager
					</Text>
				</Box>
			</Box>
		</Box>
	);
};

// Memoize the component to prevent unnecessary re-renders
export const Logo = React.memo(LogoComponent);
