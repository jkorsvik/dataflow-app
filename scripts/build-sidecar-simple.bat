@echo off
REM Simplified script to build the Python sidecar for Windows using PyInstaller directly

set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..
set OUTPUT_DIR=%PROJECT_ROOT%\src-tauri\bin\sidecar
set TEMP_DIR=%SCRIPT_DIR%build_temp

echo Creating sidecar output directory...
mkdir "%OUTPUT_DIR%" 2>nul

echo Installing PyInstaller with uv...
uv pip install pyinstaller

echo Building Python sidecar with PyInstaller...
mkdir "%TEMP_DIR%" 2>nul
cd "%TEMP_DIR%"

REM Run PyInstaller directly
pyinstaller -c -F --clean --name "dataflow_sidecar" "%PROJECT_ROOT%\src\backends\main.py"

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