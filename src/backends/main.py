import os
import sys
import uvicorn
import subprocess
import tempfile
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import platform
import shutil

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "tauri://localhost", "*"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def is_command_available(command):
    """Check if a command is available in PATH"""
    return shutil.which(command) is not None

def ensure_uvx_available():
    """Make sure uvx is available for the sidecar"""
    # First check if uvx is in PATH
    if is_command_available('uvx'):
        return 'uvx'
    
    # Try to install uvx if not found
    try:
        if platform.system() == "Windows":
            # Try to use uv to install uvx
            if is_command_available('uv'):
                subprocess.run(['uv', 'pip', 'install', 'uv'], check=True)
                if is_command_available('uvx'):
                    return 'uvx'
            
            # Try pip as fallback
            subprocess.run(['pip', 'install', 'uv'], check=True)
            if is_command_available('uvx'):
                return 'uvx'
                
            # Return direct module path as fallback
            return [sys.executable, '-m', 'uv']
        else:
            # Unix-like systems
            if is_command_available('pip'):
                subprocess.run(['pip', 'install', 'uv'], check=True)
            
            if is_command_available('uvx'):
                return 'uvx'
            
            # Return direct module path as fallback
            return [sys.executable, '-m', 'uv']
    except Exception as e:
        print(f"Error ensuring uvx: {str(e)}")
        # Return Python module path as ultimate fallback
        return [sys.executable, '-m', 'uv']

@app.get("/")
async def read_root():
    return {"message": "DataFlow API Server Running"}

@app.post("/generate")
async def generate_flow(request: dict):
    try:
        metadata_path = request.get("metadata_path")
        if not metadata_path:
            raise HTTPException(status_code=400, detail="metadata_path is required")
        
        # Ensure uvx is available
        uvx_cmd = ensure_uvx_available()
        
        # Build the command based on what's available
        if isinstance(uvx_cmd, list):
            # If we got a list, it's the Python module path
            cmd = uvx_cmd + [
                "--refresh",
                "--from", 
                "data-flow-generator",
                "data-flow-command",
                "-m", 
                metadata_path
            ]
        else:
            # Otherwise it's just the command name
            cmd = [
                uvx_cmd, 
                "--refresh",
                "--from", 
                "data-flow-generator",
                "data-flow-command",
                "-m", 
                metadata_path
            ]
        
        print(f"Executing command: {' '.join(cmd)}")
        
        process = subprocess.Popen(
            cmd, 
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate()
        
        print(f"Command output: {stdout}")
        print(f"Command errors: {stderr}")
        
        if process.returncode != 0:
            return {"success": False, "error": f"Command failed: {stderr}"}
        
        # Parse stdout for the generated HTML path
        html_path = None
        for line in stdout.splitlines():
            if "Successfully generated Pyvis HTML:" in line:
                html_path = line.split("Successfully generated Pyvis HTML:")[1].strip()
                break
        
        if not html_path:
            return {"success": False, "error": "Could not find generated HTML path in output"}
        
        return {"success": True, "html_path": html_path}
    
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"Error in generate_flow: {str(e)}\n{tb}")
        return {"success": False, "error": str(e), "traceback": tb}

def main():
    # Default port
    port = 8000
    
    # Check for port argument
    for i, arg in enumerate(sys.argv):
        if arg == "--port" and i + 1 < len(sys.argv):
            try:
                port = int(sys.argv[i + 1])
            except ValueError:
                pass
    
    # Start server
    uvicorn.run(app, host="127.0.0.1", port=port)

if __name__ == "__main__":
    main() 