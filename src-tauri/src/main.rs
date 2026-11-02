// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod tray;

use tauri::{Emitter, LogicalSize, Manager, Size, WindowEvent};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

fn ensure_autostart_registry() {
    #[cfg(windows)]
    {
        use windows_registry::{CURRENT_USER, LOCAL_MACHINE};
        const RUN_KEY: &str = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run";
        const APP_KEY_NAME: &str = "桃園地政信差服務即時通";

        if let Ok(exe_path) = std::env::current_exe() {
            let target_cmd = format!("\"{}\"", exe_path.display());

            // 1. 寫入或校準 HKCU Run (確保開機自動以引號包覆路徑啟動)
            if let Ok(run) = CURRENT_USER.create(RUN_KEY) {
                let current_val = run.get_string(APP_KEY_NAME).unwrap_or_default();
                if current_val != target_cmd {
                    let _ = run.set_string(APP_KEY_NAME, &target_cmd);
                }
                // 同步清理舊版 Electron 遺留或舊英文章節名
                let _ = run.remove_value("lah-messenger");
                let _ = run.remove_value("地政信差服務即時通");
            }

            // 2. 嘗試清理 HKLM 中殘留的無效舊路徑 (若具備管理員權限則清理，無權限則靜默忽略)
            if let Ok(hklm_run) = LOCAL_MACHINE.open(RUN_KEY) {
                let _ = hklm_run.remove_value("地政信差服務即時通");
            }
        }
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .setup(|app| {
            // 確保開機自動啟動（NSIS 與 MSI 皆適用），失敗不影響主程式啟動
            ensure_autostart_registry();
            let autolaunch = app.autolaunch();
            if !autolaunch.is_enabled().unwrap_or(false) {
                let _ = autolaunch.enable();
            }
            // 初始化系統匣 (Tray)
            let _ = tray::create_tray(app.handle())?;

            if let Some(window) = app.get_webview_window("main") {
                // 強制將網頁縮放比例重設為 1.0，防止因快取或誤觸 Ctrl+滾輪 導致放大的版面
                let _ = window.set_zoom(1.0);

                // 依據螢幕可用工作區高度自適應視窗高度，防止在 150% 桌面縮放或小筆電上底部被工作列截斷
                if let Ok(Some(monitor)) = window.current_monitor() {
                    let scale = monitor.scale_factor();
                    let mon_logical_height = monitor.size().height as f64 / scale;
                    // 螢幕邏輯高度 <= 768px（如 1080p 在 150% 縮放下為 720px）時預設採緊湊高度 600px，大螢幕預設 740px
                    let default_height: f64 = if mon_logical_height <= 768.0 { 600.0 } else { 740.0 };
                    let initial_height = default_height.clamp(500.0, (mon_logical_height - 48.0).max(500.0));
                    let _ = window.set_size(Size::Logical(LogicalSize {
                        width: 490.0,
                        height: initial_height,
                    }));
                    let _ = window.set_min_size(Some(Size::Logical(LogicalSize {
                        width: 490.0,
                        height: 500.0,
                    })));
                    let _ = window.set_max_size(Some(Size::Logical(LogicalSize {
                        width: 490.0,
                        height: 850.0,
                    })));
                    let _ = window.set_resizable(true);
                }

                // 視窗事件監聽：關閉與最小化時隱藏至系統匣 (Tray)
                let win_clone = window.clone();
                window.on_window_event(move |event| match event {
                    WindowEvent::CloseRequested { api, .. } => {
                        api.prevent_close();
                        let _ = win_clone.hide();
                        let _ = win_clone.emit("set-current-channel", "chat");
                    }
                    WindowEvent::Focused(true) => {
                        // 視窗取得焦點時自動停止工作列閃爍與退避計時
                        commands::window::stop_flashing_internal(&win_clone);
                    }
                    _ => {}
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::ad::ad_user_query,
            commands::sysinfo::get_userinfo,
            commands::sysinfo::change_user_dept,
            commands::sysinfo::add_ip_entry,
            commands::explorer::open_explorer,
            commands::explorer::open_image,
            commands::window::show_window,
            commands::window::set_title,
            commands::window::show_message_box,
            commands::window::send_notification,
            commands::window::flash_frame,
            commands::window::reload_window,
            commands::window::quit_app,
            commands::window::get_version,
            commands::window::home_ready,
            tray::toggle_unread_tray_icon,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

