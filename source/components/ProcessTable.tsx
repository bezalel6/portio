import React, {useState, useEffect, useMemo} from 'react';
import {Box, Text, useStdout} from 'ink';
import chalk from 'chalk';

interface TableProps {
	data: Array<Record<string, string>>;
	selectedIndex?: number;
}

const stripAnsi = (str: string): string => {
	return str.replace(/\x1B[[(?);]{0,2}(;?\d)*./g, '');
};

export const ProcessTable: React.FC<TableProps> = ({data, selectedIndex = -1}) => {
	const {stdout} = useStdout();
	const [viewportStart, setViewportStart] = useState(0);
	
	// Use stable terminal dimensions
	const terminalWidth = stdout?.columns || 80;
	const terminalHeight = stdout?.rows || 24;
	
	useEffect(() => {
		const availableHeight = Math.max(5, terminalHeight - 10);
		
		if (selectedIndex >= 0) {
			if (selectedIndex < viewportStart) {
				setViewportStart(selectedIndex);
			} else if (selectedIndex >= viewportStart + availableHeight) {
				setViewportStart(selectedIndex - availableHeight + 1);
			}
		}
	}, [selectedIndex, terminalHeight]);
	
	if (data.length === 0) {
		return null;
	}
	
	const columns = ['#', 'PID', 'Port', 'Process', 'Command'];
	const minWidths: Record<string, number> = {
		'#': 7,  // Increased for checkbox
		'PID': 6,
		'Port': 5,
		'Process': 10,
		'Command': 20
	};
	
	const columnWidths = useMemo(() => {
		const columnWidths: Record<string, number> = {};
		const bordersAndPadding = 4 + (columns.length - 1) * 3;
		let availableWidth = terminalWidth - bordersAndPadding;
		
		columns.forEach(col => {
			let maxWidth = col.length;
			
			data.forEach(row => {
				const cellValue = stripAnsi(row[col] || '');
				maxWidth = Math.max(maxWidth, Math.min(cellValue.length, col === 'Command' ? 60 : 30));
			});
			
			columnWidths[col] = Math.max(minWidths[col] || 10, maxWidth);
		});
		
		let totalWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
		
		if (totalWidth > availableWidth) {
			const ratio = availableWidth / totalWidth;
			
			columns.forEach(col => {
				if (col === 'Command') {
					columnWidths[col] = Math.max(minWidths[col] || 20, Math.floor((columnWidths[col] || 20) * ratio * 1.5));
				} else {
					columnWidths[col] = Math.max(minWidths[col] || 10, Math.floor((columnWidths[col] || 10) * ratio));
				}
			});
			
			totalWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
			if (totalWidth < availableWidth) {
				columnWidths['Command'] = (columnWidths['Command'] || 20) + (availableWidth - totalWidth);
			}
		}
		
		return columnWidths;
	}, [data, terminalWidth]);
	
	const truncateText = (text: string, maxWidth: number): string => {
		const stripped = stripAnsi(text);
		if (stripped.length <= maxWidth) {
			return text;
		}
		if (maxWidth < 3) {
			return text.substring(0, maxWidth);
		}
		return text.substring(0, maxWidth - 3) + '...';
	};
	
	const renderCell = (value: string, width: number) => {
		const truncated = truncateText(value, width);
		const actualLength = stripAnsi(truncated).length;
		const padding = ' '.repeat(Math.max(0, width - actualLength));
		return truncated + padding;
	};
	
	const renderRow = (row: Record<string, string>, _index: number, isHeader = false) => {
		return (
			<Box>
				<Text color="cyan">│ </Text>
				{columns.map((col, colIndex) => {
					const value = isHeader ? col : row[col] || '';
					const width = columnWidths[col] || minWidths[col] || 10;
					
					const displayValue = isHeader ? chalk.bold.white(value) : value;
					const cellContent = renderCell(displayValue, width);
					
					return (
						<React.Fragment key={col}>
							<Text>{cellContent}</Text>
							{colIndex < columns.length - 1 ? (
								<Text color="cyan"> │ </Text>
							) : (
								<Text color="cyan"> │</Text>
							)}
						</React.Fragment>
					);
				})}
			</Box>
		);
	};
	
	const createBorder = (left: string, mid: string, right: string, cross: string) => {
		return chalk.cyan(left + columns.map((col, index) => {
			const width = (columnWidths[col] || minWidths[col] || 10) + 2;
			return mid.repeat(width) + (index < columns.length - 1 ? cross : '');
		}).join('') + right);
	};
	
	const topBorder = createBorder('╭', '─', '╮', '┬');
	const middleBorder = createBorder('├', '─', '┤', '┼');
	const bottomBorder = createBorder('╰', '─', '╯', '┴');
	
	const availableHeight = Math.max(5, terminalHeight - 10);
	const visibleData = data.slice(viewportStart, viewportStart + availableHeight);
	
	// Calculate table width for centering
	const tableWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0) + 
		4 + (columns.length - 1) * 3; // borders and separators
	const leftPadding = Math.max(0, Math.floor((terminalWidth - tableWidth) / 2));
	const paddingString = ' '.repeat(leftPadding);
	
	return (
		<Box flexDirection="column">
			<Text>{paddingString}{topBorder}</Text>
			<Box>
				<Text>{paddingString}</Text>
				{renderRow(Object.fromEntries(columns.map(c => [c, c])) as any, -1, true)}
			</Box>
			<Text>{paddingString}{middleBorder}</Text>
			{visibleData.map((row, index) => (
				<React.Fragment key={viewportStart + index}>
					<Box>
						<Text>{paddingString}</Text>
						{renderRow(row, viewportStart + index)}
					</Box>
				</React.Fragment>
			))}
			<Text>{paddingString}{bottomBorder}</Text>
			{data.length > availableHeight && (
				<Box marginTop={1} justifyContent="center">
					<Text color="magenta">
						▶ [{viewportStart + 1}-{Math.min(viewportStart + availableHeight, data.length)} of {data.length}]
					</Text>
				</Box>
			)}
		</Box>
	);
};