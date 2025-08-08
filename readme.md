# 🚀 PORTY - The Port Pal You've Been Waiting For

[![npm version](https://img.shields.io/npm/v/porty-cli.svg)](https://www.npmjs.com/package/porty-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Windows Only](https://img.shields.io/badge/platform-Windows-blue)](https://github.com/yourusername/porty)

A beautiful terminal UI for managing processes on network ports. Quickly identify and kill processes occupying your development ports with style.

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

## 🚀 Quick Start

No installation needed! Just run:

```bash
npx porty-cli
```

Or install globally:

```bash
npm install -g porty-cli
porty
```

## 📖 Usage

### Interactive Mode (Default)
```bash
porty                    # Show all listening ports
porty --dev              # Show only development ports
```

### Quick Commands
```bash
porty --check 3000       # Check what's running on port 3000
porty --kill 3000        # Kill process on port 3000
porty --kill 3000 -f     # Force kill without confirmation
porty --list             # Get JSON output of all processes
porty --list 3000        # Get JSON for specific port
```

### Interactive Controls

| Key | Action |
|-----|--------|
| `↑/↓` | Navigate through processes |
| `Enter` | Kill selected process |
| `/` | Search/filter processes |
| `r` | Refresh list |
| `d` | Toggle dev/all ports |
| `v` | Toggle verbose mode |
| `c` | Clear filter |
| `q` | Quit |
| `A` | Admin kill (when normal kill fails) |

## 🎨 Port Color Coding

- 🔴 **System Ports** (< 1024) - Red
- 🟢 **Dev Ports** (3000-10000) - Teal
- 🟡 **Registered** (1024-49151) - Yellow  
- 🟢 **Ephemeral** (49152+) - Green

## 🛠️ Development Ports

Dev mode focuses on commonly used development ports:
- **3000-3005** - React, Node.js
- **4000-4001, 4200-4201** - Angular
- **5000-5001, 5173-5175** - Vite, Flask
- **8000-8001, 8080-8083** - Django, Spring
- **8888** - Jupyter
- **9000-9001, 9200, 9229** - PHP, Elasticsearch, Node Debug
- **19000-19002** - React Native

## 🖥️ System Requirements

- **Windows 10/11**
- **Node.js 16+**
- **Terminal**: Windows Terminal, PowerShell, or Git Bash (CMD not recommended)

## Development

```bash
git clone https://github.com/yourusername/porty.git
cd porty
npm install
npm run build
node dist/cli.js
```

## The Tech Stack

PORTY uses modern terminal UI capabilities:

- **[Ink](https://github.com/vadimdemedes/ink)** - React for CLIs
- **[ink-table](https://github.com/maticzav/ink-table)** - Beautiful terminal tables
- **[ink-text-input](https://github.com/vadimdemedes/ink-text-input)** - Smooth text input
- **[meow](https://github.com/sindresorhus/meow)** - CLI app helper
- **[chalk](https://github.com/chalk/chalk)** - Terminal styling

## Why PORTY?

Because every developer has a right to know what is running on their computers. No more port-induced chaos. Killing a process has to be a specifically targeted action, not slots. It's tough, but fair, like King Solomon.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT - Do whatever you want with it. Just don't blame me if you kill something important.

---

*Made with ❤️ and frustration by developers tired of `netstat -ano | findstr :3000`*