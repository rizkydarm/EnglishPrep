use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn content_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(base.join("content"))
}

/// Resolves the writable content directory
/// (`~/Library/Application Support/com.ielts-toeic-preps/content/` on macOS).
#[tauri::command]
fn get_content_dir(app: AppHandle) -> Result<String, String> {
    Ok(content_dir(&app)?.to_string_lossy().into_owned())
}

fn bundled_content_source(app: &AppHandle) -> Option<PathBuf> {
    let candidates = [
        app.path().resource_dir().ok()?.join("resources").join("content"),
        app.path().resource_dir().ok()?.join("content"),
    ];
    candidates.into_iter().find(|p| p.is_dir())
}

fn copy_missing_recursive(src: &Path, dst: &Path) -> std::io::Result<usize> {
    let mut copied = 0;
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let target = dst.join(entry.file_name());
        if file_type.is_dir() {
            copied += copy_missing_recursive(&entry.path(), &target)?;
        } else if file_type.is_file() && !target.exists() {
            std::fs::copy(entry.path(), &target)?;
            copied += 1;
        }
    }
    Ok(copied)
}

/// First-run seed: copies bundled `resources/content` into the writable
/// content dir. Idempotent — never overwrites existing files, so it is safe
/// to call on every startup and from a frontend Reload trigger.
#[tauri::command]
fn ensure_seeded(app: AppHandle) -> Result<String, String> {
    let target = content_dir(&app)?;
    std::fs::create_dir_all(&target).map_err(|e| e.to_string())?;
    let Some(source) = bundled_content_source(&app) else {
        return Ok(target.to_string_lossy().into_owned());
    };
    copy_missing_recursive(&source, &target).map_err(|e| e.to_string())?;
    Ok(target.to_string_lossy().into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if let Err(e) = (|| -> Result<(), String> {
                let handle = app.handle().clone();
                ensure_seeded(handle)?;
                Ok(())
            })() {
                eprintln!("[seed] first-run content seed failed: {e}");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, get_content_dir, ensure_seeded])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
