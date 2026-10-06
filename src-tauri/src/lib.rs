use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::Instant;
use tauri::Emitter;

#[cfg(unix)]
use std::os::unix::process::CommandExt;

static ACTIVE_PROCESS_PID: Mutex<Option<u32>> = Mutex::new(None);

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TerminalStreamPayload {
    pub text: String,
    pub is_stderr: bool,
}

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
    pub new_cwd: Option<String>,
}

#[tauri::command]
fn get_current_working_dir() -> Result<String, String> {
    std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn select_folder_dialog() -> Result<Option<String>, String> {
    #[cfg(target_os = "linux")]
    {
        // Try zenity first (common on Ubuntu, Debian, GNOME)
        if let Ok(output) = Command::new("zenity")
            .args(["--file-selection", "--directory", "--title=Pilih Folder Workspace"])
            .output()
        {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() {
                    return Ok(Some(path));
                }
            }
        }
        // Try kdialog (KDE Plasma)
        if let Ok(output) = Command::new("kdialog")
            .args(["--getexistingdirectory", "."])
            .output()
        {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() {
                    return Ok(Some(path));
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        let script = r#"
        Add-Type -AssemblyName System.Windows.Forms
        $f = New-Object System.Windows.Forms.FolderBrowserDialog
        if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
            Write-Output $f.SelectedPath
        }
        "#;
        if let Ok(output) = Command::new("powershell")
            .args(["-NoProfile", "-Command", script])
            .output()
        {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() {
                    return Ok(Some(path));
                }
            }
        }
    }

    Ok(None)
}

#[tauri::command]
fn list_directory(dir_path: String) -> Result<Vec<FileEntry>, String> {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    let expanded_path = if dir_path.starts_with("~/") {
        dir_path.replacen("~", &home, 1)
    } else if dir_path == "~" {
        home
    } else {
        dir_path
    };

    let path = Path::new(&expanded_path);
    if !path.exists() {
        return Err(format!("Direktori tidak ditemukan: {}", expanded_path));
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
async fn execute_command(
    app: tauri::AppHandle,
    command: String,
    cwd: Option<String>,
) -> Result<CommandResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let start = Instant::now();
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());

        let resolved_cwd = cwd.map(|dir| {
            if dir.starts_with("~/") {
                dir.replacen("~", &home, 1)
            } else if dir == "~" {
                home.clone()
            } else {
                dir
            }
        });

        let delimiter = "___CWD_DELIM___";
        let (mut cmd, is_cd) = if cfg!(target_os = "windows") {
            let mut c = Command::new("cmd");
            let wrapped = format!("{} & echo {} & cd", command, delimiter);
            c.args(["/C", &wrapped]);
            (c, command.trim().to_lowercase().starts_with("cd"))
        } else {
            let mut c = Command::new("sh");
            let wrapped = format!("{{ {} ; }} ; __RET=$? ; echo '{}' ; pwd ; exit $__RET", command, delimiter);
            c.args(["-c", &wrapped]);
            #[cfg(unix)]
            c.process_group(0);
            (c, command.trim().starts_with("cd"))
        };

        if let Some(ref dir) = resolved_cwd {
            if !dir.is_empty() && Path::new(dir).exists() {
                cmd.current_dir(dir);
            }
        }

        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        let mut child = cmd.spawn().map_err(|e| format!("Gagal mengeksekusi perintah terminal: {}", e))?;
        let pid = child.id();
        {
            let mut lock = ACTIVE_PROCESS_PID.lock().unwrap();
            *lock = Some(pid);
        }

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        let app_out = app.clone();
        let stdout_handle = std::thread::spawn(move || {
            let mut collected = String::new();
            if let Some(out) = stdout {
                let reader = BufReader::new(out);
                for line in reader.lines() {
                    if let Ok(l) = line {
                        if !l.contains("___CWD_DELIM___") {
                            let _ = app_out.emit("terminal_stream", TerminalStreamPayload {
                                text: format!("{}\n", l),
                                is_stderr: false,
                            });
                        }
                        collected.push_str(&l);
                        collected.push('\n');
                    }
                }
            }
            collected
        });

        let app_err = app.clone();
        let stderr_handle = std::thread::spawn(move || {
            let mut collected = String::new();
            if let Some(err) = stderr {
                let reader = BufReader::new(err);
                for line in reader.lines() {
                    if let Ok(l) = line {
                        let _ = app_err.emit("terminal_stream", TerminalStreamPayload {
                            text: format!("{}\n", l),
                            is_stderr: true,
                        });
                        collected.push_str(&l);
                        collected.push('\n');
                    }
                }
            }
            collected
        });

        let status = child.wait().map_err(|e| format!("Gagal menunggu proses: {}", e))?;

        // Clear active PID
        {
            let mut lock = ACTIVE_PROCESS_PID.lock().unwrap();
            if *lock == Some(pid) {
                *lock = None;
            }
        }

        let raw_stdout = stdout_handle.join().unwrap_or_default();
        let stderr = stderr_handle.join().unwrap_or_default();
        let duration = start.elapsed().as_millis();
        let exit_code = status.code().unwrap_or(if status.success() { 0 } else { 1 });

        let mut stdout = raw_stdout.clone();
        let mut new_cwd = None;

        if let Some(pos) = raw_stdout.rfind(delimiter) {
            stdout = raw_stdout[..pos].trim_end_matches('\n').trim_end_matches('\r').to_string();
            let after = raw_stdout[pos + delimiter.len()..].trim();
            if !after.is_empty() && (is_cd || exit_code == 0) {
                new_cwd = Some(after.to_string());
            }
        }

        Ok(CommandResult {
            stdout,
            stderr,
            exit_code,
            duration_ms: duration,
            new_cwd,
        })
    })
    .await
    .map_err(|e| format!("Task execution failed: {}", e))?
}

#[tauri::command]
fn cancel_command() -> Result<bool, String> {
    let pid_opt = {
        let mut lock = ACTIVE_PROCESS_PID.lock().unwrap();
        lock.take()
    };

    if let Some(pid) = pid_opt {
        #[cfg(target_os = "windows")]
        {
            let _ = Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/T", "/F"])
                .output();
        }
        #[cfg(not(target_os = "windows"))]
        {
            let pgid_arg = format!("-{}", pid);
            let _ = Command::new("kill").args(["-INT", &pgid_arg]).output();
            let _ = Command::new("kill").args(["-INT", &pid.to_string()]).output();
            let _ = Command::new("kill").args(["-TERM", &pgid_arg]).output();
            let _ = Command::new("kill").args(["-TERM", &pid.to_string()]).output();
        }
        Ok(true)
    } else {
        Ok(false)
    }
}


#[tauri::command]
fn create_system_shortcuts(desktop: bool, start_menu: bool) -> Result<String, String> {
    #[cfg(target_os = "linux")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        let exec_path = std::env::var("APPIMAGE")
            .unwrap_or_else(|_| {
                std::env::current_exe()
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_else(|_| "multi-agent-app".to_string())
            });

        let icon_path = format!("{}/.local/share/icons/multi-agent-app.png", home);
        let desktop_entry = format!(
            "[Desktop Entry]\nType=Application\nName=Multi-Agent APP\nGenericName=AI Agent Workspace\nComment=Modern AI Multi-Agent Workspace\nExec=\"{}\" %U\nIcon={}\nTerminal=false\nCategories=Development;IDE;Utility;\nStartupWMClass=multi-agent-app\n",
            exec_path, icon_path
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
            cancel_command,
            create_system_shortcuts,
            select_folder_dialog,
            get_current_working_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
