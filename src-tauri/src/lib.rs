use serde::Serialize;
use std::{
    env,
    fs,
    net::{SocketAddr, TcpListener, TcpStream},
    path::PathBuf,
    sync::Mutex,
    thread,
    time::{Duration, Instant},
};
use tauri::{Manager, State};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};
use uuid::Uuid;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct BackendConnection {
    base_url: String,
    token: String,
}

struct BackendState {
    connection: BackendConnection,
    address: SocketAddr,
    child: Mutex<Option<CommandChild>>,
}

#[tauri::command]
fn backend_connection(state: State<'_, BackendState>) -> Result<BackendConnection, String> {
    let deadline = Instant::now() + Duration::from_secs(30);
    while Instant::now() < deadline {
        if TcpStream::connect_timeout(&state.address, Duration::from_millis(250)).is_ok() {
            return Ok(state.connection.clone());
        }
        thread::sleep(Duration::from_millis(150));
    }
    Err("研序（Agentic Research）本地后端未能在 30 秒内启动，请查看桌面应用日志".to_string())
}

fn reserve_loopback_port() -> Result<(u16, SocketAddr), String> {
    let listener = TcpListener::bind(("127.0.0.1", 0))
        .map_err(|error| format!("无法分配本地后端端口: {error}"))?;
    let address = listener
        .local_addr()
        .map_err(|error| format!("无法读取本地后端端口: {error}"))?;
    let port = address.port();
    drop(listener);
    Ok((port, address))
}

fn desktop_data_dir(app: &tauri::App) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let path = match env::var_os("PAPERMILL_DESKTOP_DATA_DIR") {
        Some(value) => PathBuf::from(value),
        None => app.path().app_data_dir()?,
    };
    fs::create_dir_all(&path)?;
    Ok(path)
}

fn stop_backend(app_handle: &tauri::AppHandle) {
    let Some(state) = app_handle.try_state::<BackendState>() else {
        return;
    };
    if let Ok(mut guard) = state.child.lock() {
        if let Some(child) = guard.take() {
            if let Err(error) = child.kill() {
                log::warn!("停止研序 sidecar 失败: {error}");
            }
        }
    };
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![backend_connection])
        .setup(|app| {
            let (port, address) = reserve_loopback_port()?;
            let token = Uuid::new_v4().simple().to_string();
            let data_dir = desktop_data_dir(app)?;
            let connection = BackendConnection {
                base_url: format!("http://127.0.0.1:{port}"),
                token: token.clone(),
            };
            let args = vec![
                "serve".to_string(),
                "--port".to_string(),
                port.to_string(),
                "--data-dir".to_string(),
                data_dir.to_string_lossy().into_owned(),
                "--token".to_string(),
                token,
                "--parent-pid".to_string(),
                std::process::id().to_string(),
            ];
            let (mut events, child) = app.shell().sidecar("papermill-backend")?.args(args).spawn()?;

            tauri::async_runtime::spawn(async move {
                while let Some(event) = events.recv().await {
                    match event {
                        CommandEvent::Stdout(bytes) => {
                            log::info!("[backend] {}", String::from_utf8_lossy(&bytes));
                        }
                        CommandEvent::Stderr(bytes) => {
                            log::warn!("[backend] {}", String::from_utf8_lossy(&bytes));
                        }
                        CommandEvent::Error(error) => log::error!("[backend] {error}"),
                        CommandEvent::Terminated(payload) => {
                            log::info!("研文工坊 sidecar 已退出: {:?}", payload.code);
                        }
                        _ => {}
                    }
                }
            });

            app.manage(BackendState {
                connection,
                address,
                child: Mutex::new(Some(child)),
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building the Agentic Research desktop application");

    app.run(|app_handle, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            stop_backend(app_handle);
        }
    });
}
