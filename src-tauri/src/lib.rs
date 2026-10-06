use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;
use std::time::Instant;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CommandResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub duration_ms: u128,
}

#[tauri::command]
fn list_directory(dir_path: String) -> Result<Vec<FileEntry>, String> {
    let path = Path::new(&dir_path);
    if !path.exists() {
        return Err(format!("Direktori tidak ditemukan: {}", dir_path));
    }

    let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
    let mut result = Vec::new();

    for entry in entries.flatten() {
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        result.push(FileEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
            size: metadata.len(),
        });
    }

    // Sort: directories first, then alphabetical
    result.sort_by(|a, b| {
        if a.is_dir == b.is_dir {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        } else if a.is_dir {
            std::cmp::Ordering::Less
        } else {
            std::cmp::Ordering::Greater
        }
    });

    Ok(result)
}

#[tauri::command]
fn read_file_content(file_path: String) -> Result<String, String> {
    fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_file_content(file_path: String, content: String) -> Result<(), String> {
    fs::write(&file_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn execute_command(command: String, cwd: Option<String>) -> Result<CommandResult, String> {
    let start = Instant::now();
    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = Command::new("cmd");
        c.args(["/C", &command]);
        c
    } else {
        let mut c = Command::new("sh");
        c.args(["-c", &command]);
        c
    };

    if let Some(dir) = cwd {
        if !dir.is_empty() {
            cmd.current_dir(dir);
        }
    }

    match cmd.output() {
        Ok(output) => {
            let duration = start.elapsed().as_millis();
            let exit_code = output.status.code().unwrap_or(if output.status.success() { 0 } else { 1 });
            Ok(CommandResult {
                stdout: String::from_utf8_lossy(&output.stdout).to_string(),
                stderr: String::from_utf8_lossy(&output.stderr).to_string(),
                exit_code,
                duration_ms: duration,
            })
        }
        Err(e) => Err(format!("Gagal mengeksekusi perintah terminal: {}", e)),
    }
}

#[tauri::command]
fn create_system_shortcuts(desktop: bool, start_menu: bool) -> Result<String, String> {
    #[cfg(target_os = "linux")]
    {
        let exec_path = std::env::var("APPIMAGE")
            .unwrap_or_else(|_| {
                std::env::current_exe()
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_else(|_| "multi-agent-desktop".to_string())
            });

        let home = std::env::var("HOME").map_err(|e| format!("HOME environment variable not found: {}", e))?;
        let desktop_entry = format!(
            "[Desktop Entry]\nType=Application\nName=Multi-Agent Desktop\nGenericName=AI Agent Workspace\nComment=Modern AI Multi-Agent Workspace\nExec=\"{}\" %U\nIcon=utilities-terminal\nTerminal=false\nCategories=Development;IDE;\nStartupWMClass=multi-agent-app\n",
            exec_path
        );

        let mut created = Vec::new();

        if desktop {
            let desktop_dir = Path::new(&home).join("Desktop");
            if desktop_dir.exists() {
                let shortcut_path = desktop_dir.join("multi-agent-desktop.desktop");
                fs::write(&shortcut_path, &desktop_entry).map_err(|e| e.to_string())?;
                let _ = Command::new("chmod").args(["+x", &shortcut_path.to_string_lossy().to_string()]).output();
                created.push("Desktop");
            }
        }

        if start_menu {
            let apps_dir = Path::new(&home).join(".local/share/applications");
            let _ = fs::create_dir_all(&apps_dir);
            let shortcut_path = apps_dir.join("multi-agent-desktop.desktop");
            fs::write(&shortcut_path, &desktop_entry).map_err(|e| e.to_string())?;
            let _ = Command::new("chmod").args(["+x", &shortcut_path.to_string_lossy().to_string()]).output();
            let _ = Command::new("update-desktop-database").arg(&apps_dir.to_string_lossy().to_string()).output();
            created.push("Menu Aplikasi (Start Menu)");
        }

        Ok(format!("Shortcut berhasil dibuat: {}", created.join(", ")))
    }

    #[cfg(target_os = "windows")]
    {
        let exe_path = std::env::current_exe()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        let mut ps_script = String::from("$WshShell = New-Object -comObject WScript.Shell;\n");
        let mut created = Vec::new();

        if desktop {
            ps_script.push_str(&format!(
                "$s1 = $WshShell.CreateShortcut(\"$([Environment]::GetFolderPath('Desktop'))\\Multi-Agent Desktop.lnk\");\n$s1.TargetPath = \"{}\";\n$s1.Save();\n",
                exe_path.replace('"', "\\\"")
            ));
            created.push("Desktop");
        }

        if start_menu {
            ps_script.push_str(&format!(
                "$s2 = $WshShell.CreateShortcut(\"$([Environment]::GetFolderPath('Programs'))\\Multi-Agent Desktop.lnk\");\n$s2.TargetPath = \"{}\";\n$s2.Save();\n",
                exe_path.replace('"', "\\\"")
            ));
            created.push("Start Menu");
        }

        let output = Command::new("powershell")
            .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &ps_script])
            .output()
            .map_err(|e| format!("Gagal menjalankan PowerShell: {}", e))?;

        if output.status.success() {
            Ok(format!("Shortcut Windows berhasil dibuat: {}", created.join(", ")))
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        let _ = desktop;
        let _ = start_menu;
        Ok("Sistem operasi tidak memerlukan pembuatan shortcut khusus.".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_directory,
            read_file_content,
            save_file_content,
            execute_command,
            create_system_shortcuts
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
