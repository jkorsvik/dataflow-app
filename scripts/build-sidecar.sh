#!/bin/bash
# Script to build the Python sidecar for Unix systems
# Uses uv for Python package management

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Create the output directory if it doesn't exist
OUTPUT_DIR="$PROJECT_ROOT/src-tauri/bin/sidecar"
mkdir -p "$OUTPUT_DIR"

# Set up venv directory
VENV_DIR="$SCRIPT_DIR/python_venv"

# Make sure uv is installed
echo "Checking for uv..."
if ! python -m uv --version &>/dev/null; then
    echo "Installing uv..."
    pip install uv
fi

# Create the virtual environment with uv
echo "Creating Python virtual environment..."
python -m uv venv "$VENV_DIR" --refresh

# Install required packages with uv
echo "Installing PyInstaller and dependencies..."
python -m uv pip install --python="$VENV_DIR/bin/python" pyinstaller
python -m uv pip sync --python="$VENV_DIR/bin/python" "$PROJECT_ROOT/src/backends/requirements.txt"

# Build the sidecar with PyInstaller
echo "Building Python sidecar..."
MAIN_PY_PATH="$PROJECT_ROOT/src/backends/main.py"

# Create a temporary directory for PyInstaller output
TEMP_DIR="$SCRIPT_DIR/build_temp"
mkdir -p "$TEMP_DIR"

# Run PyInstaller from the temp directory
cd "$TEMP_DIR"
export PYTHONPATH="$VENV_DIR/bin"
"$VENV_DIR/bin/python" -m PyInstaller --noconfirm --onefile --console --clean --name "dataflow_sidecar" "$MAIN_PY_PATH"

# Copy the built executable to the sidecar directory
echo "Copying sidecar to target directory..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    EXE_PATH="$TEMP_DIR/dist/dataflow_sidecar"
else
    # Linux
    EXE_PATH="$TEMP_DIR/dist/dataflow_sidecar"
fi

if [ -f "$EXE_PATH" ]; then
    cp "$EXE_PATH" "$OUTPUT_DIR/"
    echo "Sidecar build complete!"
else
    echo "Error: Sidecar executable not found at $EXE_PATH"
    exit 1
fi

# Clean up temporary files
rm -rf "$TEMP_DIR" 