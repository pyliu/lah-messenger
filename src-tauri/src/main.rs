// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod tray;

use tauri::{Emitter, Manager, WindowEvent};
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
    #[cfg(windows)]
    unsafe {
        // [強制鎖定 DPI 縮放] 忽略 Windows 系統桌面縮放 (125%、150%)，永遠保持 100% 原始像素
        // 與原 Electron 方案 app.commandLine.appendSwitch('force-device-scale-factor', '1') 一致
        let current_args = std::env::var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS").unwrap_or_default();
        if !current_args.contains("--force-device-scale-factor") {
            let new_args = if current_args.is_empty() {
                "--force-device-scale-factor=1".to_string()
            } else {
                format!("{} --force-device-scale-factor=1", current_args)
            };
            std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", new_args);
        }
    }

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

