# Script to build the Python sidecar for Windows
# Uses uv for Python package management

# Get the current script directory
$scriptDir = $PSScriptRoot
$projectRoot = (Get-Item $scriptDir).Parent.FullName

# Create the output directory if it doesn't exist
$outputDir = Join-Path $projectRoot "src-tauri\bin\sidecar"
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Force -Path $outputDir
}

# Set up venv directory
$venvDir = Join-Path $scriptDir "python_venv"

# Make sure uv is installed
Write-Host "Checking for uv..."
try {
    python -m uv --version >$null 2>&1
}
catch {
    Write-Host "Installing uv..."
    pip install uv
}

# Create the virtual environment with uv
Write-Host "Creating Python virtual environment..."
python -m uv venv $venvDir --refresh

# Install required packages with uv
Write-Host "Installing PyInstaller and dependencies..."
python -m uv pip install --python="$(Join-Path $venvDir 'Scripts\python.exe')" pyinstaller
python -m uv pip sync --python="$(Join-Path $venvDir 'Scripts\python.exe')" (Join-Path $projectRoot "src\backends\requirements.txt")

# Build the sidecar with PyInstaller
Write-Host "Building Python sidecar..."
$mainPyPath = Join-Path $projectRoot "src\backends\main.py"

# Create a temporary directory for PyInstaller output
$tempDir = Join-Path $scriptDir "build_temp"
if (!(Test-Path $tempDir)) {
    New-Item -ItemType Directory -Force -Path $tempDir
}

# Run PyInstaller from the temp directory
Push-Location $tempDir
$pythonPath = Join-Path $venvDir "Scripts\python.exe"
$env:PYTHONPATH = Join-Path $venvDir "Scripts"
& $pythonPath -m PyInstaller --noconfirm --onefile --console --clean --name "dataflow_sidecar" $mainPyPath
Pop-Location

# Copy the built executable to the sidecar directory
Write-Host "Copying sidecar to target directory..."
$exePath = Join-Path $tempDir "dist\dataflow_sidecar.exe"
if (Test-Path $exePath) {
    Copy-Item -Path $exePath -Destination "$outputDir\dataflow_sidecar.exe" -Force
    Write-Host "Sidecar build complete!"
}
else {
    Write-Host "Error: Sidecar executable not found at $exePath"
    exit 1
}

# Clean up temporary files
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
} 