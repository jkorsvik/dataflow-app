# DataFlow Application

A desktop application that generates flow diagrams from various metadata formats. Built with Tauri, React, and Python.

## Prerequisites

### All Platforms
- [Python 3.8+](https://www.python.org/downloads/)
- [Rust](https://www.rust-lang.org/tools/install)
- [Node.js](https://nodejs.org/) (or [Bun](https://bun.sh/docs/installation))

### Windows-Specific Requirements
- **⚠️ Administrator privileges** are required for installing some dependencies
- Microsoft C++ Build Tools - [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- WebView2 Runtime (included in Windows 10 update 1803+)

### macOS-Specific Requirements
- Xcode or Xcode Command Line Tools (`xcode-select --install`)

### Linux-Specific Requirements
- Various packages depending on your distribution (see [Tauri Prerequisites](https://tauri.app/start/prerequisites/#linux))

## Installation

### Install Bun (Recommended)

#### Windows
```powershell
# Run in PowerShell with administrator privileges
winget install -e --id OvenInteractive.Bun
# Or alternatively:
powershell -c "irm bun.sh/install.ps1 | iex"

# Add to path if not automatically added
[System.Environment]::SetEnvironmentVariable(
    "Path",
    [System.Environment]::GetEnvironmentVariable("Path", "User") + ";$env:USERPROFILE\.bun\bin",
    [System.EnvironmentVariableTarget]::User
)
```

#### macOS/Linux
```bash
curl -fsSL https://bun.sh/install | bash
```

### Install uv for Python dependencies (Recommended)

#### Windows
```powershell
# Run in PowerShell with administrator privileges
winget install -e --id astral-sh.uv
# Or alternatively:
pip install uv
```

#### macOS/Linux
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

## Development

1. Clone the repository
2. Install dependencies:
```bash
cd dataflow-app
npm install
```

3. Run the development server:
```bash
npm run tauri dev
```

## Building

### Simplified Build (Recommended)

The simplified build script avoids most issues by using standard tools and minimizing dependencies:

```bash
# First, fix line endings if you're having CRLF/LF issues
npm run fix:line-endings

# Run the simplified build process
npm run build:simple
```

### Standard Build

For the full-featured build with faster Python package management:

```bash
npm run build:app
```

⚠️ **Important Note for Windows Users:** The build process will attempt to install `uv` and `Bun` if they are not already installed. This requires administrator privileges and may trigger UAC prompts. If installation succeeds, you may need to restart your terminal or IDE before these tools become available in your PATH.

## Troubleshooting

### Windows Common Issues

1. **"Command not found" after installation**: Restart your terminal/IDE after installing new command-line tools
2. **Permission errors**: Make sure to run the installers with administrator privileges
3. **Build fails with Python errors**: Try the simplified build with `npm run build:simple` which avoids external tool dependencies
4. **Line ending issues**: Run `npm run fix:line-endings` to ensure all files have LF line endings

### If the Build Keeps Failing

If you encounter persistent issues with the build process:

1. Make sure Python 3.8+ is installed and in your PATH
2. Install virtualenv manually: `pip install virtualenv`
3. Try running the simplified build: `npm run build:simple`
4. Check that the `src/backends` directory and `requirements.txt` exist
5. Try running the commands manually:
```
# Windows
cd dataflow-app
python -m virtualenv scripts\python_venv
scripts\python_venv\Scripts\activate.bat
pip install pyinstaller
pip install -r src\backends\requirements.txt
```

### macOS/Linux Common Issues

1. **Permission errors**: You may need to use `sudo` for some installation steps
2. **Missing dependencies**: Refer to the [Tauri Prerequisites](https://tauri.app/start/prerequisites/) for your platform