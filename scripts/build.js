#!/usr/bin/env node

/**
 * Cross-platform build script for the DataFlow application
 * This script detects the OS and runs the appropriate build commands
 */

import { execSync } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Determine platform
const platform = os.platform();
const isWindows = platform === 'win32';
const isMac = platform === 'darwin';
const isLinux = platform === 'linux';

// Script directory and project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptDir = __dirname;
const projectRoot = path.resolve(scriptDir, '..');

// Check for Python
function ensurePythonInstalled() {
    try {
        console.log('Checking if Python is installed...');
        execSync('python --version', { stdio: 'ignore' });
        console.log('✅ Python is installed');
        return true;
    } catch (e) {
        try {
            console.log('Trying python3 command...');
            execSync('python3 --version', { stdio: 'ignore' });
            console.log('✅ Python (python3) is installed');
            return true;
        } catch (e2) {
            console.error('❌ Python is not installed or not in PATH');
            console.error('Please install Python from https://www.python.org/downloads/');
            return false;
        }
    }
}

// Ensure uv is installed
function ensureUvInstalled() {
    try {
        console.log('Checking if uv is installed...');
        execSync('uv --version', { stdio: 'ignore' });
        console.log('✅ uv is installed');
        return true;
    } catch (e) {
        console.log('❌ uv is not installed. Installing...');
        try {
            execSync('pip install uv', { stdio: 'inherit' });
            console.log('✅ uv installed successfully');
            return true;
        } catch (installError) {
            console.error('❌ Failed to install uv');
            console.error('Please install uv manually: pip install uv');
            return false;
        }
    }
}

// Ensure Rust is installed
function ensureRustInstalled() {
    try {
        console.log('Checking if Rust is installed...');
        execSync('rustc --version', { stdio: 'ignore' });
        console.log('✅ Rust is installed');
        return true;
    } catch (e) {
        console.error('❌ Rust is not installed.');
        console.error('Please install Rust using rustup: https://www.rust-lang.org/tools/install');
        console.error('For Windows: winget install -e --id Rustlang.Rustup');
        console.error('For Mac/Linux: curl --proto \'=https\' --tlsv1.2 https://sh.rustup.rs -sSf | sh');
        return false;
    }
}

// Install Bun
function ensureBunInstalled() {
    try {
        console.log('Checking if Bun is installed...');
        execSync('bun --version', { stdio: 'ignore' });
        console.log('✅ Bun is installed');
        return true;
    } catch (e) {
        console.log('❌ Bun is not available in PATH');
        if (isWindows) {
            console.log('\n⚠️  ADMIN PRIVILEGES REQUIRED ⚠️');
            console.log('Installing Bun on Windows requires administrator privileges.');
            console.log('You may see a UAC prompt. Please accept it to continue.\n');

            try {
                console.log('Attempting to install Bun using winget...');
                execSync('winget install --id OvenInteractive.Bun -e', { stdio: 'inherit' });
                console.log('✅ Bun installed successfully. You may need to restart your terminal or IDE.');
                console.log('If you still see errors, please restart your terminal/IDE and try again.');
                return false; // Still return false to indicate restart may be needed
            } catch (installError) {
                console.error('❌ Failed to install Bun automatically.');
                console.error('Please install Bun manually from: https://bun.sh/docs/installation');
                return false;
            }
        } else if (isMac || isLinux) {
            try {
                console.log('Attempting to install Bun...');
                execSync('curl -fsSL https://bun.sh/install | bash', { stdio: 'inherit' });
                console.log('✅ Bun installed successfully. You may need to restart your terminal or IDE.');
                return false; // Restart may be needed
            } catch (installError) {
                console.error('❌ Failed to install Bun automatically.');
                console.error('Please install Bun manually from: https://bun.sh/docs/installation');
                return false;
            }
        } else {
            console.error('❌ Please install Bun manually from: https://bun.sh/docs/installation');
            return false;
        }
    }
}

// Ensure Node.js dependencies are installed
function installNodeDependencies() {
    console.log('Installing Node.js dependencies...');
    try {
        // Check if bun is available
        const bunAvailable = ensureBunInstalled();
        if (bunAvailable) {
            execSync('bun install', { cwd: projectRoot, stdio: 'inherit' });
            console.log('✅ Node.js dependencies installed with bun');
            return true;
        } else {
            // If on Windows and Bun failed to install, warn about restart
            if (isWindows) {
                console.log('⚠️ If Bun was just installed, you may need to restart your terminal/IDE before it\'s available in PATH');
                console.log('Falling back to npm for now. Please run the build again after restarting your terminal/IDE to use bun.');
            }
            // Fallback to npm
            execSync('npm install', { cwd: projectRoot, stdio: 'inherit' });
            console.log('✅ Node.js dependencies installed with npm');
            return true;
        }
    } catch (e) {
        console.error('❌ Failed to install Node.js dependencies');
        console.error(e.message);
        return false;
    }
}

// Build the Python sidecar
function buildPythonSidecar() {
    console.log('Building Python sidecar...');
    try {
        if (isWindows) {
            // Try batch file
            execSync('uv --version', { stdio: 'ignore' });
            execSync('.\\scripts\\build-sidecar.bat', {
                cwd: projectRoot,
                stdio: 'inherit'
            });
        } else {
            execSync('bash ./scripts/build-sidecar.sh', {
                cwd: projectRoot,
                stdio: 'inherit'
            });
        }
        console.log('✅ Python sidecar built successfully');
        return true;
    } catch (e) {
        console.error('❌ Failed to build Python sidecar');
        console.error(e.message);
        return false;
    }
}

// Build the Tauri application
function buildTauriApp() {
    console.log('Building Tauri application...');
    try {
        // Try to use bun
        try {
            execSync('bun --version', { stdio: 'ignore' });
            execSync('bun run tauri build', { cwd: projectRoot, stdio: 'inherit' });
        } catch (e) {
            console.log('⚠️ Bun not available, falling back to npm');
            execSync('npm run tauri build', { cwd: projectRoot, stdio: 'inherit' });
        }
        console.log('✅ Tauri application built successfully');
        return true;
    } catch (e) {
        console.error('❌ Failed to build Tauri application');
        console.error(e.message);
        return false;
    }
}

// Main function
async function main() {
    console.log('📦 Starting DataFlow build process...');

    // Check platform-specific prerequisites
    console.log(`Detected platform: ${platform}`);

    if (isWindows) {
        console.log('Windows prerequisites:');
        console.log('- Microsoft C++ Build Tools must be installed');
        console.log('- WebView2 Runtime must be installed (included in Windows 10 update 1803+)');
        console.log('- Python must be installed and in PATH');
        console.log('- ⚠️ Administrator privileges may be required for installing uv and Bun');
    } else if (isMac) {
        console.log('macOS prerequisites:');
        console.log('- Xcode or Xcode Command Line Tools must be installed');
        console.log('- Python must be installed');
    } else if (isLinux) {
        console.log('Linux prerequisites:');
        console.log('- Required packages depend on your distribution');
        console.log('- Python must be installed');
        console.log('- See https://tauri.app/start/prerequisites/#linux');
    }

    // Ensure dependencies are installed
    const pythonInstalled = ensurePythonInstalled();
    if (!pythonInstalled) {
        console.error('Python is required to continue. Please install it and add to PATH.');
        process.exit(1);
    }

    const uvInstalled = ensureUvInstalled();
    if (!uvInstalled) {
        console.error('uv is required to continue. Please install it and add to PATH.');
        process.exit(1);
    }

    const rustInstalled = ensureRustInstalled();
    if (!rustInstalled) {
        console.error('Rust is required to continue. Please install it.');
        process.exit(1);
    }

    const bunInstalled = ensureBunInstalled();
    if (!bunInstalled) {
        console.log('⚠️ Bun was not found or was just installed.');
        console.log('You may need to restart your terminal/IDE before continuing.');
        console.log('The build will continue with npm as a fallback, but we recommend using bun for better performance.');
        console.log('\nPress Ctrl+C to cancel and restart your terminal, or wait 5 seconds to continue...');
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    const nodeDepInstalled = installNodeDependencies();
    if (!nodeDepInstalled) {
        console.error('Failed to install Node.js dependencies. Please install them manually.');
        process.exit(1);
    }

    // Build sidecar and Tauri app
    const sidecarBuilt = buildPythonSidecar();
    if (!sidecarBuilt) {
        console.error('Failed to build the Python sidecar. See errors above.');
        process.exit(1);
    }

    const tauriBuilt = buildTauriApp();
    if (!tauriBuilt) {
        console.error('Failed to build the Tauri application. See errors above.');
        process.exit(1);
    }

    console.log('\n✨ Build process completed successfully!');
    console.log('Your application can be found in:');

    if (isWindows) {
        console.log('- Windows: src-tauri/target/release/bundle/nsis/');
    } else if (isMac) {
        console.log('- macOS: src-tauri/target/release/bundle/dmg/');
        console.log('- macOS: src-tauri/target/release/bundle/macos/');
    } else if (isLinux) {
        console.log('- Linux: src-tauri/target/release/bundle/appimage/');
        console.log('- Linux: src-tauri/target/release/bundle/deb/');
    }
}

// Run the main function
main().catch(err => {
    console.error('Build failed with error:', err);
    process.exit(1);
}); 