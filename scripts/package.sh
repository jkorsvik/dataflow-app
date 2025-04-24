#!/bin/bash
# Script to package the entire application for distribution

# Exit on any error
set -e

echo "Starting DataFlow packaging process..."

# Ensure bun is installed
if ! command -v bun &> /dev/null; then
    echo "Installing bun..."
    curl -fsSL https://bun.sh/install | bash
    # Source the updated path 
    export PATH="$HOME/.bun/bin:$PATH"
    echo "Bun installed successfully"
fi

# 1. Install dependencies
echo "Installing dependencies..."
bun install

# 2. Build the Python sidecar
echo "Building Python sidecar..."
bun run build:sidecar

# 3. Build the Tauri application
echo "Building Tauri application..."
bun run tauri build

echo "Packaging complete! The distributable can be found in:"
echo " - Windows: src-tauri/target/release/bundle/nsis/"
echo " - macOS: src-tauri/target/release/bundle/dmg/"
echo " - Linux: src-tauri/target/release/bundle/appimage/ or src-tauri/target/release/bundle/deb/" 