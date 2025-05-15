#!/usr/bin/env node

/**
 * Simplified build script focusing on reliability
 * Uses only standard Python tools and avoids dependencies that need installation
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Determine platform
const isWindows = process.platform === 'win32';

// Utility function to run a command with better error messaging
function runCommand(command, options = {}) {
    console.log(`> ${command}`);
    try {
        return execSync(command, {
            stdio: 'inherit',
            cwd: options.cwd || projectRoot,
            ...options
        });
    } catch (error) {
        console.error(`\n❌ Command failed: ${command}`);
        if (options.exitOnError !== false) {
            process.exit(1);
        }
        throw error;
    }
}

// Create directories
function ensureDirectories() {
    console.log('Creating necessary directories...');
    const dirs = [
        path.join(projectRoot, 'src-tauri', 'bin', 'sidecar')
    ];

    for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created ${dir}`);
        }
    }
}

// Fix line endings
function fixLineEndings() {
    console.log('Normalizing line endings...');
    try {
        runCommand('node scripts/fix-line-endings.js');
        console.log('✅ Line endings normalized');
        return true;
    } catch (error) {
        console.error('⚠️ Line ending normalization failed, but continuing build...');
        return false;
    }
}

// Install dependencies
function installDependencies() {
    console.log('Installing Node.js dependencies...');
    try {
        runCommand('bun install');
        console.log('✅ Dependencies installed');
        return true;
    } catch (error) {
        console.error('❌ Failed to install dependencies');
        return false;
    }
}

// Build the Python sidecar
function buildPythonSidecar() {
    console.log('Building Python sidecar...');
    console.log('Creating Python virtual environment...');

    // Create venv directory
    const venvDir = path.join(projectRoot, 'scripts', 'python_venv');
    if (!fs.existsSync(venvDir)) {
        fs.mkdirSync(venvDir, { recursive: true });
    }

    try {
        // Use uv for virtual environment creation and package installation
        console.log('Checking for uv...');
        try {
            runCommand('uv --version', { stdio: 'pipe', exitOnError: false });
        } catch (error) {
            console.log('Installing uv...');
            runCommand('pip install uv', { stdio: 'pipe' });
        }

        // Create the virtual environment with uv
        console.log('Creating virtual environment with uv...');
        runCommand(`uv venv "${venvDir}" --refresh`);
        console.log('✅ Virtual environment created with uv');

        if (!fs.existsSync(venvDir)) {
            console.error('Virtual environment creation failed');
            return false;
        }

        // Install dependencies using uv
        if (isWindows) {
            // For Windows, we need to run a batch script
            const tempScript = path.join(projectRoot, 'scripts', 'temp-build.bat');
            const scriptContent = `@echo off\r\n` +
                `echo Installing packages with uv...\r\n` +
                `cd "${projectRoot}"\r\n` +
                `uv pip install --python="${venvDir}\\Scripts\\python.exe" pyinstaller\r\n` +
                `uv pip sync --python="${venvDir}\\Scripts\\python.exe" "${projectRoot}\\src\\backends\\requirements.txt"\r\n` +
                `mkdir "${projectRoot}\\scripts\\build_temp" 2>nul\r\n` +
                `cd "${projectRoot}\\scripts\\build_temp"\r\n` +
                `echo Building sidecar with PyInstaller...\r\n` +
                `set PYTHONPATH="${venvDir}\\Scripts"\r\n` +
                `"${venvDir}\\Scripts\\python.exe" -m PyInstaller --noconfirm --onefile --console --clean --name "dataflow_sidecar" "${projectRoot}\\src\\backends\\main.py"\r\n` +
                `copy /Y "dist\\dataflow_sidecar.exe" "${projectRoot}\\src-tauri\\bin\\sidecar\\dataflow_sidecar.exe"\r\n` +
                `if %ERRORLEVEL% NEQ 0 exit /b %ERRORLEVEL%\r\n`;

            fs.writeFileSync(tempScript, scriptContent);
            runCommand(tempScript);

            // Clean up temporary script
            if (fs.existsSync(tempScript)) {
                fs.unlinkSync(tempScript);
            }
        } else {
            // For Unix-like systems
            const tempScript = path.join(projectRoot, 'scripts', 'temp-build.sh');
            const scriptContent = `#!/bin/bash\n` +
                `echo "Installing packages with uv..."\n` +
                `cd "${projectRoot}"\n` +
                `uv pip install --python="${venvDir}/bin/python" pyinstaller\n` +
                `uv pip sync --python="${venvDir}/bin/python" "${projectRoot}/src/backends/requirements.txt"\n` +
                `mkdir -p "${projectRoot}/scripts/build_temp"\n` +
                `cd "${projectRoot}/scripts/build_temp"\n` +
                `echo "Building sidecar with PyInstaller..."\n` +
                `export PYTHONPATH="${venvDir}/bin"\n` +
                `"${venvDir}/bin/python" -m PyInstaller --noconfirm --onefile --console --clean --name "dataflow_sidecar" "${projectRoot}/src/backends/main.py"\n` +
                `cp "dist/dataflow_sidecar" "${projectRoot}/src-tauri/bin/sidecar/"\n`;

            fs.writeFileSync(tempScript, scriptContent);
            fs.chmodSync(tempScript, '755'); // Make executable
            runCommand(`bash "${tempScript}"`);

            // Clean up temporary script
            if (fs.existsSync(tempScript)) {
                fs.unlinkSync(tempScript);
            }
        }

        console.log('✅ Python sidecar built successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to build Python sidecar:', error.message);
        return false;
    }
}

// Build the Tauri application
function buildTauriApp() {
    console.log('Building Tauri application...');
    try {
        runCommand('bun run tauri build');
        console.log('✅ Tauri application built successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to build Tauri application');
        return false;
    }
}

// Clean up
function cleanup() {
    console.log('Cleaning up temporary files...');
    const dirsToClean = [
        path.join(projectRoot, 'scripts', 'build_temp')
    ];

    for (const dir of dirsToClean) {
        if (fs.existsSync(dir)) {
            try {
                if (isWindows) {
                    runCommand(`rmdir /S /Q "${dir}"`, { exitOnError: false });
                } else {
                    runCommand(`rm -rf "${dir}"`, { exitOnError: false });
                }
            } catch (error) {
                console.error(`⚠️ Failed to remove directory ${dir}: ${error.message}`);
            }
        }
    }
}

// Main build process
async function main() {
    console.log('🔨 Starting simplified build process...');
    console.log(`Platform: ${isWindows ? 'Windows' : process.platform}`);

    // Ensure all needed directories exist
    ensureDirectories();

    // Fix line endings
    fixLineEndings();

    // Install dependencies
    const depsInstalled = installDependencies();
    if (!depsInstalled) {
        console.error('❌ Failed to install dependencies. Aborting build.');
        process.exit(1);
    }

    // Build sidecar first
    const sidecarBuilt = buildPythonSidecar();
    if (!sidecarBuilt) {
        console.error('❌ Failed to build Python sidecar. Aborting build.');
        cleanup();
        process.exit(1);
    }

    // Build Tauri app
    const tauriBuilt = buildTauriApp();
    if (!tauriBuilt) {
        console.error('❌ Failed to build Tauri application. Build process failed.');
        cleanup();
        process.exit(1);
    }

    // Clean up
    cleanup();

    console.log('\n✅ Build completed successfully!');

    if (isWindows) {
        console.log('📦 Installer can be found in: src-tauri\\target\\release\\bundle\\nsis\\');
    } else if (process.platform === 'darwin') {
        console.log('📦 Application can be found in: src-tauri/target/release/bundle/dmg/');
        console.log('📦 Application can be found in: src-tauri/target/release/bundle/macos/');
    } else {
        console.log('📦 Application can be found in: src-tauri/target/release/bundle/appimage/');
        console.log('📦 Application can be found in: src-tauri/target/release/bundle/deb/');
    }
}

// Run the main function
main().catch(err => {
    console.error('Build failed with error:', err);
    cleanup();
    process.exit(1);
}); 