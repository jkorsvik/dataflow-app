@echo off
REM Script to build the Python sidecar for Windows using batch file
REM Uses uv for Python package management

set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..
set OUTPUT_DIR=%PROJECT_ROOT%\src-tauri\bin\sidecar
set VENV_DIR=%SCRIPT_DIR%python_venv
set TEMP_DIR=%SCRIPT_DIR%build_temp

echo Creating sidecar output directory...
mkdir "%OUTPUT_DIR%" 2>nul

echo Checking for uv...
python -m uv --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing uv...
    pip install uv
)

echo Creating Python virtual environment...
python -m uv venv "%VENV_DIR%" --refresh

echo Installing PyInstaller and dependencies...
python -m uv pip install --python="%VENV_DIR%\Scripts\python.exe" pyinstaller
python -m uv pip sync --python="%VENV_DIR%\Scripts\python.exe" "%PROJECT_ROOT%\src\backends\requirements.txt"

echo Building Python sidecar with PyInstaller...
mkdir "%TEMP_DIR%" 2>nul
cd "%TEMP_DIR%"
set PYTHONPATH=%VENV_DIR%\Scripts
"%VENV_DIR%\Scripts\python.exe" -m PyInstaller --noconfirm --onefile --console --clean --name "dataflow_sidecar" "%PROJECT_ROOT%\src\backends\main.py"

echo Copying sidecar to target directory...
if exist "dist\dataflow_sidecar.exe" (
    copy /Y "dist\dataflow_sidecar.exe" "%OUTPUT_DIR%\dataflow_sidecar.exe"
    echo Sidecar build complete!
) else (
    echo Error: Failed to copy sidecar executable
    exit /b 1
)

echo Cleaning up temporary files...
cd "%SCRIPT_DIR%"
rmdir /S /Q "%TEMP_DIR%" 