#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import chalk from 'chalk';
import {InteractiveUI} from './components/InteractiveUI.js';
import {CheckMode} from './components/CheckMode.js';
import {KillMode} from './components/KillMode.js';
import {getProcessesOnPorts, getProcessOnPort} from './utils/portDetector.js';

const cli = meow(`
	${chalk.cyan.bold('PORTIO')} - THE port pal you've been waiting for

	${chalk.bold('Usage')}
	  $ portio                    ${chalk.dim('# Interactive mode showing all ports (default)')}
	  $ portio --dev              ${chalk.dim('# Show only development ports')}
	  $ portio --check <port>     ${chalk.dim('# Check what\'s running on a specific port')}
	  $ portio --wtf <port>       ${chalk.dim('# Same as --check (for the frustrated)')}
	  $ portio --kill <port>      ${chalk.dim('# Kill process on a specific port')}
	  $ portio --mine <port>      ${chalk.dim('# Force kill process on port (no confirmation)')}
	  $ portio --list [port]      ${chalk.dim('# JSON output of processes')}

	${chalk.bold('Options')}
	  --dev, -d          Show only development ports (3000-10000, etc)
	  --check, -c        Check what's running on a specific port
	  --wtf              Alias for --check (when you're frustrated)
	  --kill, -k         Kill process on a specific port
	  --mine, -m         Kill process on port without confirmation
	  --force, -f        Skip confirmation when killing
	  --list, -l         Output process list as JSON
	  --help             Show this help message
	  --version          Show version

	${chalk.bold('Interactive Controls')}
	  ↑/↓                Navigate through processes
	  Enter              Kill selected process
	  /                  Filter processes
	  r                  Refresh list
	  d                  Toggle dev/all ports
	  v                  Toggle verbose mode
	  p                  Toggle full paths/filenames
	  c                  Clear filter
	  q                  Quit
	  A                  Admin kill (when normal kill fails)

	${chalk.bold('Examples')}
	  $ portio -m 3000 && npm run dev    ${chalk.dim('# Ensure port 3000 is free before starting dev server')}
	  $ portio --mine 8080 && python -m http.server 8080  ${chalk.dim('# Chain with any server')}
	  $ portio                    ${chalk.dim('# Show interactive UI with all ports')}
	  $ portio --dev              ${chalk.dim('# Show only dev ports')}
	  $ portio --check 3000       ${chalk.dim('# See what\'s on port 3000')}
	  $ portio --kill 3000        ${chalk.dim('# Kill process on port 3000')}
	  $ portio --list             ${chalk.dim('# Get JSON of all processes')}
`, {
	importMeta: import.meta,
	flags: {
		dev: {
			type: 'boolean',
			shortFlag: 'd',
			description: 'Show only development ports'
		},
		check: {
			type: 'string',
			shortFlag: 'c'
		},
		wtf: {
			type: 'string',
			description: 'Alias for --check (for the frustrated)'
		},
		kill: {
			type: 'string',
			shortFlag: 'k'
		},
		mine: {
			type: 'string',
			shortFlag: 'm',
			description: 'Kill process on port without confirmation'
		},
		force: {
			type: 'boolean',
			shortFlag: 'f'
		},
		list: {
			type: 'string',
			shortFlag: 'l',
			isMultiple: false
		},
		help: {
			type: 'boolean'
		},
		version: {
			type: 'boolean'
		}
	}
});

async function main() {
	const {flags} = cli;

	if (flags.help) {
		cli.showHelp();
		return;
	}

	if (flags.version) {
		cli.showVersion();
		return;
	}

	if (flags.list !== undefined) {
		const port = flags.list ? parseInt(flags.list, 10) : undefined;
		
		if (port && isNaN(port)) {
			console.error(chalk.red('Error: Invalid port number'));
			process.exit(1);
		}

		try {
			if (port) {
				const process = await getProcessOnPort(port);
				console.log(JSON.stringify(process, null, 2));
			} else {
				const processes = await getProcessesOnPorts(!flags.dev);  // Show all by default, dev only if flag set
				console.log(JSON.stringify(processes, null, 2));
			}
		} catch (error) {
			console.error(chalk.red('Error getting process information:'), error);
			process.exit(1);
		}
		return;
	}

	// Handle both --check and --wtf
	const checkPort = flags.check || flags.wtf;
	if (checkPort) {
		const port = parseInt(checkPort, 10);
		
		if (isNaN(port)) {
			console.error(chalk.red('Error: Invalid port number'));
			process.exit(1);
		}

		render(<CheckMode port={port} />);
		return;
	}

	if (flags.mine) {
		const port = parseInt(flags.mine, 10);
		
		if (isNaN(port)) {
			console.error(chalk.red('Error: Invalid port number'));
			process.exit(1);
		}

		render(<KillMode port={port} force={true} />);
		return;
	}

	if (flags.kill) {
		const port = parseInt(flags.kill, 10);
		
		if (isNaN(port)) {
			console.error(chalk.red('Error: Invalid port number'));
			process.exit(1);
		}

		render(<KillMode port={port} force={flags.force} />);
		return;
	}

	// Check if we can use interactive mode (raw mode support)
	if (!process.stdin.isTTY || !process.stdin.setRawMode) {
		console.error(chalk.yellow('⚠️  Interactive mode requires a TTY terminal with raw mode support.'));
		console.error(chalk.dim('Try using Windows Terminal, Git Bash, or PowerShell instead of CMD.'));
		console.error('');
		console.error(chalk.bold('Alternative options:'));
		console.error('  portio --list          # Get JSON output of all processes');
		console.error('  portio --check <port>  # Check what\'s on a specific port');
		console.error('  portio --kill <port>   # Kill process on a specific port');
		process.exit(1);
	}
	
	// Don't use alternate screen buffer to prevent terminal issues on Windows
	// This keeps the output visible after exit
	
	const app = render(<InteractiveUI initialShowAll={!flags.dev} />, {  // Show all by default, dev only if flag set
		exitOnCtrlC: false  // We handle this in the component
	});
	
	// Wait for app to finish
	app.waitUntilExit().then(() => {
		// Just clear and unmount without switching screen buffers
		app.clear();
		app.unmount();
		// Add a small delay to ensure clean exit
		setTimeout(() => {
			process.exit(0);
		}, 50);
	});
}

main().catch(error => {
	console.error(chalk.red('Fatal error:'), error);
	process.exit(1);
});
