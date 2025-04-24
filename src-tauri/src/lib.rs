// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::fs;
use std::path::Path;
use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, Runtime, State};
use which;

// Structure to hold the sidecar process
struct PythonSidecar(Mutex<Option<Child>>);

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum UvKind {
    Uv,
    Uvx,
}

fn find_uvx_in_path() -> Option<std::path::PathBuf> {
    // Try to find uvx in PATH
    let candidates = if cfg!(windows) {
        vec!["uvx.exe", "uvx"]
    } else {
        vec!["uvx"]
    };
    for exe in candidates {
        if let Ok(path) = which::which(exe) {
            return Some(path);
        }
    }
    None
}

fn ensure_uvx_exists(uv_dir: &Path) -> Result<std::path::PathBuf, String> {
    // 1. Check PATH first
    if let Some(path) = find_uvx_in_path() {
        return Ok(path);
    }

    let uvx_bin = if cfg!(windows) {
        uv_dir.join("uvx.exe")
    } else {
        uv_dir.join("uvx")
    };

    if uvx_bin.exists() {
        return Ok(uvx_bin.clone());
    }

    // Create the directory if it doesn't exist
    if !uv_dir.exists() {
        fs::create_dir_all(uv_dir).map_err(|e| e.to_string())?;
    }

    // Try curl
    if !cfg!(windows) {
        let install_script = format!(
            "cd {} && curl -LsSf https://astral.sh/uv/install.sh | sh",
            uv_dir.display()
        );
        let status = Command::new("sh").arg("-c").arg(&install_script).status();
        if let Ok(status) = status {
            if uvx_bin.exists() && status.success() {
                return Ok(uvx_bin.clone());
            }
        }

        // Try wget
        let install_script = format!(
            "cd {} && wget -qO- https://astral.sh/uv/install.sh | sh",
            uv_dir.display()
        );
        let status = Command::new("sh").arg("-c").arg(&install_script).status();
        if let Ok(status) = status {
            if uvx_bin.exists() && status.success() {
                return Ok(uvx_bin.clone());
            }
        }
    }

    // Windows-specific: try PowerShell irm
    #[cfg(windows)]
    {
        let install_script = format!(
            "cd {} ; powershell -ExecutionPolicy ByPass -c \"irm https://astral.sh/uv/install.ps1 | iex\"",
            uv_dir.display()
        );
        let status = Command::new("cmd").args(["/C", &install_script]).status();
        if let Ok(status) = status {
            if uvx_bin.exists() && status.success() {
                return Ok(uvx_bin.clone());
            }
        }
    }

    // Windows-specific: try winget install astral-sh.uv
    #[cfg(windows)]
    {
        let status = Command::new("winget")
            .args(["install", "--id", "astral-sh.uv", "-e"])
            .status();
        if let Ok(status) = status {
            // After install, try to find in PATH again
            if let Some(path) = find_uvx_in_path() {
                return Ok(path);
            }
            if uvx_bin.exists() && status.success() {
                return Ok(uvx_bin.clone());
            }
        }
    }

    // Try cargo as fallback
    let status = Command::new("cargo")
        .args([
            "install",
            "--git",
            "https://github.com/astral-sh/uv",
            "uv",
            "--root",
            uv_dir.to_str().unwrap(),
        ])
        .status();
    if let Ok(status) = status {
        if uvx_bin.exists() && status.success() {
            return Ok(uvx_bin.clone());
        }
    }

    // Final check: PATH
    if let Some(path) = find_uvx_in_path() {
        return Ok(path);
    }

    Err("Failed to install or locate uvx with all available methods".to_string())
}

// Start the Python sidecar server
fn start_sidecar_server(app: &AppHandle) -> Result<u16, String> {
    let resource_path = app
        .path()
        .resource_dir()
        .ok_or("Failed to get resource directory")?;
    
    // Use a fixed port for simplicity (could be made dynamic if needed)
    let port = 8000;
    
    // Get the sidecar binary path based on platform
    let sidecar_binary = if cfg!(windows) {
        resource_path.join("bin").join("sidecar").join("dataflow_sidecar.exe")
    } else {
        resource_path.join("bin").join("sidecar").join("dataflow_sidecar")
    };
    
    // Ensure the sidecar binary exists
    if !sidecar_binary.exists() {
        return Err(format!(
            "Sidecar binary not found at: {}",
            sidecar_binary.display()
        ));
    }
    
    // Start the sidecar process
    let sidecar_process = Command::new(sidecar_binary)
        .args(["--port", &port.to_string()])
        .spawn()
        .map_err(|e| format!("Failed to start sidecar process: {}", e))?;
    
    // Store the sidecar process
    let python_sidecar: State<PythonSidecar> = app.state();
    *python_sidecar.0.lock().unwrap() = Some(sidecar_process);
    
    Ok(port)
}

#[tauri::command]
async fn generate_flow(app: AppHandle, metadata_path: String) -> Result<String, String> {
    use reqwest::Client;
    
    // Get the sidecar state
    let python_sidecar: State<PythonSidecar> = app.state();
    let sidecar_running = python_sidecar.0.lock().unwrap().is_some();
    
    // Start the sidecar if not already running
    let port = if !sidecar_running {
        start_sidecar_server(&app)?
    } else {
        8000 // Default port if already running
    };
    
    // Make HTTP request to the sidecar
    let client = Client::new();
    let response = client
        .post(&format!("http://localhost:{}/generate", port))
        .json(&serde_json::json!({
            "metadata_path": metadata_path
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to communicate with sidecar: {}", e))?;
    
    let result: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse sidecar response: {}", e))?;
    
    // Check for success or error
    if result["success"].as_bool().unwrap_or(false) {
        if let Some(html_path) = result["html_path"].as_str() {
            return Ok(html_path.to_string());
        }
    }
    
    // Return error if we didn't get a successful response with an HTML path
    if let Some(error) = result["error"].as_str() {
        return Err(error.to_string());
    }
    
    Err("Unknown error occurred".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(context: tauri::Context) {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(PythonSidecar(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![greet, generate_flow])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // When the window is closed, kill the sidecar process
                let python_sidecar: State<PythonSidecar> = window.app_handle().state();
                if let Some(mut child) = python_sidecar.0.lock().unwrap().take() {
                    let _ = child.kill();
                }
            }
        })
        .run(context)
        .expect("error while running tauri application");
}
