import os
import sys
import uvicorn
import subprocess
import tempfile
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "tauri://localhost"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def read_root():
    return {"message": "DataFlow API Server Running"}

@app.post("/generate")
async def generate_flow(request: dict):
    try:
        metadata_path = request.get("metadata_path")
        if not metadata_path:
            raise HTTPException(status_code=400, detail="metadata_path is required")
        
        # Run the uvx command
        cmd = [
            "uvx", 
            "--refresh",
            "--from", 
            "data-flow-generator",
            "data-flow-command",
            "-m", 
            metadata_path
        ]
        
        process = subprocess.Popen(
            cmd, 
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            return {"success": False, "error": stderr}
        
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
        return {"success": False, "error": str(e)}

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