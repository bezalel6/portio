# PORTY

*THE port pal you've been waiting for*

## We All Know This Feeling

Maybe you were doing some work, maybe you closed out of the IDE without killing the development server.
Next time you try to launch it, you see the port's occupado and your heart sinks. 

```
Error: listen EADDRINUSE: address already in use :::3000
```

Now you have two options, each worse than the other: 
- Open Task Manager and start playing `node.exe` roulette until the port's free again
- Give up on it let the port roll over. Let that `localhost:3000` dream die for the foreseeable boot-time of your machine


## Enter PORTY

PORTY shows you what actually matters:
```
┌─────┬───────┬───────┬───────────┬──────────────────────────────────────────┐
│ #   │ PID   │ Port  │ Process   │ Command                                  │
├─────┼───────┼───────┼───────────┼──────────────────────────────────────────┤
│ 1   │ 12345 │ 3000  │ node.exe  │ next                                     │
│ 2   │ 67890 │ 8080  │ node.exe  │ nodemon                                  │
│ 3   │ 11111 │ 5173  │ node.exe  │ vite                                     │
└─────┴───────┴───────┴───────────┴──────────────────────────────────────────┘
```

Built with [Ink](https://github.com/vadimdemedes/ink) for a beautiful, interactive terminal experience.

## Installation

### Quick Start (no install necessary)
```bash
npx porty
```

### Install Globally
```bash
npm install -g porty
porty
```

### Development
```bash
git clone https://github.com/bezalel6/porty.git
cd porty
npm install
npm run dev
porty
```

## Usage

### Interactive Mode (Default)

```bash
porty          # Shows dev ports (3000, 8080, 5173, etc.)
porty --all    # Shows ALL ports including system services
```

You'll get a beautiful, interactive terminal UI where you can:

- **Navigate** with arrow keys (↑/↓)
- **Kill processes** by pressing Enter on any row
- **Filter** with `/` to search by port, PID, or command
- **Refresh** with `r` to update the list
- **Toggle** between dev/all ports with `a`
- **Verbose mode** with `v` to see full command paths
- **Clear filters** with `c`
- **Quit** with `q` or `Ctrl+C`

### Want to get straight to the point?

Need to know what's on a specific port? No interaction needed:

```bash
porty --check 3000
# or shorter
porty -c 3000
```

Shows exactly what's running on port 3000 and exits.

### Direct Kill Mode

When you just want it gone:

```bash
porty --kill 3000
# or shorter
porty -k 3000
```

Shows what's about to be killed and confirms before executing, unless ran with -f or --force flag. which will not confirm.

### List Mode

For scripting or piping to other tools:

```bash
porty --list       # JSON output of all processes
porty --list 3000  # JSON for specific port
```

## Features

### Beautiful Terminal UI
- **Real-time updates** - Pressing `r` will refresh the list so you can watch processes spawn and die
- **Color-coded ports** - Dev ports are highlighted for quick identification. 
- **Smooth interactions** - Keyboard-driven workflow that feels native

### Developer-First Design
- **Dev ports by default** - Only shows what you care about (3000, 8080, 5173, 4200, etc.)
- **Zero configuration** - Works out of the box

## The Tech Stack

PORTY uses modern terminal UI capabilities:

- **[Ink](https://github.com/vadimdemedes/ink)** - React for CLIs
- **[ink-table](https://github.com/maticzav/ink-table)** - Beautiful terminal tables
- **[ink-text-input](https://github.com/vadimdemedes/ink-text-input)** - Smooth text input
- **[meow](https://github.com/sindresorhus/meow)** - CLI app helper
- **[chalk](https://github.com/chalk/chalk)** - Terminal styling

## Why PORTY?
 Because every developer has a right to know what is running on their compouters. No more port-enduced chaos. Killing a process has to be a specifically targeted action, not slots. It's tough, but fair. like king Solomon.
 ## License
 MIT - Do whatever you want with it. Just don't blame     
 me if you kill something important.
  ---
 *Made with ❤️ and frustration*