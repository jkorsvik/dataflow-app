import os
import sys
import data_flow_generator.generate_data_flow
import uvicorn
import subprocess
import tempfile
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import platform
import shutil
import data_flow_generator

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1420",
        "tauri://localhost",
        "*",
    ],  # Add your frontend URL
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

        result = data_flow_generator.generate_data_flow.plot_data_flow(metadata_path)
        html = data_flow_generator.generate_data_flow.draw_complete_data_flow(result)
        return json.dumps({"data": result, "html": html})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
