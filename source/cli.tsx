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
	${chalk.cyan.bold('PORTY')} - THE port pal you've been waiting for

	${chalk.bold('Usage')}
	  $ porty                    ${chalk.dim('# Interactive mode showing all ports (default)')}
	  $ porty --dev              ${chalk.dim('# Show only development ports')}
	  $ porty --check <port>     ${chalk.dim('# Check what\'s running on a specific port')}
	  $ porty --kill <port>      ${chalk.dim('# Kill process on a specific port')}
	  $ porty --list [port]      ${chalk.dim('# JSON output of processes')}

	${chalk.bold('Options')}
	  --dev, -d          Show only development ports (3000-10000, etc)
	  --check, -c        Check what's running on a specific port
	  --kill, -k         Kill process on a specific port
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
	  c                  Clear filter
	  q                  Quit
	  A                  Admin kill (when normal kill fails)

	${chalk.bold('Examples')}
	  $ porty                    ${chalk.dim('# Show interactive UI with all ports')}
	  $ porty --dev              ${chalk.dim('# Show only dev ports')}
	  $ porty --check 3000       ${chalk.dim('# See what\'s on port 3000')}
	  $ porty --kill 3000        ${chalk.dim('# Kill process on port 3000')}
	  $ porty -k 3000 -f         ${chalk.dim('# Force kill without confirmation')}
	  $ porty --list             ${chalk.dim('# Get JSON of all processes')}
	  $ porty --list 3000        ${chalk.dim('# Get JSON for port 3000')}
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
		kill: {
			type: 'string',
			shortFlag: 'k'
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

	if (flags.check) {
		const port = parseInt(flags.check, 10);
		
		if (isNaN(port)) {
			console.error(chalk.red('Error: Invalid port number'));
			process.exit(1);
		}

		render(<CheckMode port={port} />);
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
		console.error('  porty --list          # Get JSON output of all processes');
		console.error('  porty --check <port>  # Check what\'s on a specific port');
		console.error('  porty --kill <port>   # Kill process on a specific port');
		process.exit(1);
	}
	
	// Enter alternate screen buffer for TUI
	process.stdout.write('\x1b[?1049h');
	
	const app = render(<InteractiveUI initialShowAll={!flags.dev} />, {  // Show all by default, dev only if flag set
		exitOnCtrlC: false  // We handle this in the component
	});
	
	// Wait for app to finish
	app.waitUntilExit().then(() => {
		app.clear();
		app.unmount();
		// Exit alternate screen buffer
		process.stdout.write('\x1b[?1049l');
	});
}

main().catch(error => {
	console.error(chalk.red('Fatal error:'), error);
	process.exit(1);
});
