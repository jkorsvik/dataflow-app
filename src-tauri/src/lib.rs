// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::{json, Value};
use std::fs;
use std::path::Path;
use std::process::Command;
use tauri::AppHandle;
use which;

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

#[tauri::command]
async fn generate_flow(app: AppHandle, metadata_path: String) -> Result<Value, String> {
    use reqwest::Client;
    // Simply call the already-running sidecar at port 8000
    let client = Client::new();
    let response = client
        .post("http://127.0.0.1:8000/generate")
        .json(&serde_json::json!({ "metadata_path": metadata_path }))
        .send()
        .await
        .map_err(|e| format!("Failed to communicate with sidecar: {}", e))?;
    let result: Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse sidecar response: {}", e))?;
    Ok(result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(context: tauri::Context) {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![generate_flow])
        .run(context)
        .expect("error while running tauri application");
}
