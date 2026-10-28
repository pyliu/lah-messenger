// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod tray;

use tauri::{Emitter, Manager, WindowEvent};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

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
            let autolaunch = app.autolaunch();
            if !autolaunch.is_enabled().unwrap_or(false) {
                let _ = autolaunch.enable();
            }
            // 初始化系統匣 (Tray)
            let _ = tray::create_tray(app.handle())?;

            if let Some(window) = app.get_webview_window("main") {
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
