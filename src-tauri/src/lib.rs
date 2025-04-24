// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::fs;
use std::path::Path;
use tauri::AppHandle;
use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn ensure_uv_exists(uv_dir: &Path) -> Result<(), String> {
    let uv_bin = if cfg!(windows) {
        uv_dir.join("uv.exe")
    } else {
        uv_dir.join("uv")
    };

    if uv_bin.exists() {
        return Ok(());
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
        let status = Command::new("sh")
            .arg("-c")
            .arg(&install_script)
            .status();
        if let Ok(status) = status {
            if uv_bin.exists() && status.success() {
                return Ok(());
            }
        }

        // Try wget
        let install_script = format!(
            "cd {} && wget -qO- https://astral.sh/uv/install.sh | sh",
            uv_dir.display()
        );
        let status = Command::new("sh")
            .arg("-c")
            .arg(&install_script)
            .status();
        if let Ok(status) = status {
            if uv_bin.exists() && status.success() {
                return Ok(());
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
        if uv_bin.exists() && status.success() {
            return Ok(());
        }
    }

    // Windows-specific: try PowerShell irm
    #[cfg(windows)]
    {
        let install_script = format!(
            "cd {} ; powershell -ExecutionPolicy ByPass -c \"irm https://astral.sh/uv/install.ps1 | iex\"",
            uv_dir.display()
        );
        let status = Command::new("cmd")
            .args(["/C", &install_script])
            .status();
        if let Ok(status) = status {
            if uv_bin.exists() && status.success() {
                return Ok(());
            }
        }
    }

    Err("Failed to install uv with all available methods".to_string())
}



#[tauri::command]
fn generate_flow(metadata_path: String) -> Result<String, String> {
    use std::process::Command;

    // Run the uvx command directly from PyPI
    let output = Command::new("uvx")
        .args([
            "--refresh",
            "--from",
            "data-flow-generator",
            "data-flow-command",
            "-m",
            &metadata_path,
        ])
        .output()
        .map_err(|e| format!("Failed to execute uvx: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    // Parse stdout for the generated HTML path
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut html_path: Option<String> = None;
    for line in stdout.lines() {
        if let Some(idx) = line.find("Successfully generated Pyvis HTML:") {
            let path = line[idx + "Successfully generated Pyvis HTML:".len()..].trim();
            html_path = Some(path.to_string());
            break;
        }
    }

    match html_path {
        Some(path) => Ok(path),
        None => Err(format!("Could not find generated HTML path in output:\n{}", stdout)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(context: tauri::Context) {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, generate_flow])
        .run(context)
        .expect("error while running tauri application");
}
