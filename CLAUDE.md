# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PORTY is a Windows-only terminal UI application for managing processes on network ports. It's built with TypeScript, React (via Ink), and provides an interactive TUI for developers to identify and kill processes occupying ports.

## Build and Development Commands

```bash
# Install dependencies
npm install

# Build the TypeScript project
npm run build

# Development mode with watch
npm run dev

# Run tests, linting, and formatting checks
npm test

# Run the CLI after building
node dist/cli.js

# Test different modes
node dist/cli.js                  # Interactive mode (shows all ports by default)
node dist/cli.js --dev            # Interactive mode showing dev ports only
node dist/cli.js --help           # Show help
node dist/cli.js --list           # JSON output of all processes
node dist/cli.js --check 3000     # Check specific port
node dist/cli.js --kill 3000      # Kill process on port
```

## Architecture

### Core Components Structure

The application follows a React-based TUI architecture using Ink:

1. **Entry Point** (`source/cli.tsx`): 
   - Parses CLI arguments using `meow`
   - Routes to different modes (interactive, check, kill, list)
   - Renders appropriate React component with Ink

2. **Port Detection** (`source/utils/portDetector.ts`):
   - Windows-only implementation using `netstat -ano` and `wmic`
   - Batch queries for performance (single WMIC call for all PIDs)
   - Returns `ProcessInfo` objects with pid, port, processName, command

3. **UI Components** (`source/components/`):
   - `InteractiveUI.tsx`: Main interactive table with keyboard navigation
   - `ProcessTable.tsx`: Renders the bordered table with proper column alignment
   - `CheckMode.tsx`: Non-interactive port check display
   - `KillMode.tsx`: Kill confirmation interface

### Key Design Decisions

- **Windows-Only**: Uses Windows-specific commands (`netstat`, `wmic`, `taskkill`)
- **Performance Optimization**: Batch WMIC queries instead of per-process calls
- **ANSI Handling**: `stripAnsi` function in ProcessTable for accurate column width calculation
- **Color Scheme**: Professional TUI design inspired by htop/k9s:
  - Dimmed borders and UI chrome
  - Functional colors (green for dev ports, yellow for system)
  - Inverse selection highlighting

### Port Display Modes

**Default Mode**: Shows all listening ports
**Dev Mode** (--dev flag): Filters to show only development ports:
- 3000-3005, 4000-4001, 4200-4201
- 5000-5001, 5173-5175
- 8000-8001, 8080-8083, 8888
- 9000-9001, 9200, 9229
- 19000-19002

## Critical Implementation Details

### Table Rendering
The `ProcessTable` component handles complex terminal table rendering with:
- ANSI escape code stripping for width calculations
- Proper border alignment with column content
- Support for colored/styled content while maintaining alignment

### Process Detection Performance
The `getPorts()` function in `portDetector.ts` uses a two-step approach:
1. Get all listening ports via `netstat -ano`
2. Single batch WMIC query for all process details (avoiding N+1 queries)

### Interactive Navigation
The `InteractiveUI` component manages state for:
- Selected row index with arrow key navigation
- Filter mode toggling with `/` key
- Process killing with confirmation
- Real-time refresh capability