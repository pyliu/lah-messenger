use serde::Deserialize;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

const NORMAL_ICON_BYTES: &[u8] = include_bytes!("../icons/message.ico");
const UNREAD_ICON_BYTES: &[u8] = include_bytes!("../icons/message_notice.ico");

#[derive(Deserialize)]
pub struct UnreadPayload {
    pub unread: u32,
}

pub fn create_tray(app: &AppHandle) -> Result<TrayIcon, tauri::Error> {
    let show_i = MenuItem::with_id(app, "show", "顯示視窗", true, None::<&str>)?;
    let hide_i = MenuItem::with_id(app, "hide", "隱藏視窗", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "關閉即時通", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_i, &hide_i, &quit_i])?;

    let initial_icon = Image::from_bytes(NORMAL_ICON_BYTES)
        .unwrap_or_else(|_| app.default_window_icon().unwrap().clone());

    let tray = TrayIconBuilder::with_id("main-tray")
        .tooltip(format!("桃園即時通 v{}", env!("CARGO_PKG_VERSION")))
        .icon(initial_icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            }
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            "quit" => {
                app.cleanup_before_exit();
                std::process::exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    Ok(tray)
}

#[tauri::command]
pub fn toggle_unread_tray_icon(app: AppHandle, payload: UnreadPayload) -> Result<(), String> {
    let tray = match app.tray_by_id("main-tray") {
        Some(t) => t,
        None => return Ok(()),
    };

    if payload.unread > 0 {
        let tooltip = format!("👉 您有 {} 則未讀訊息！", payload.unread);
        let _ = tray.set_tooltip(Some(&tooltip));
        if let Ok(icon) = Image::from_bytes(UNREAD_ICON_BYTES) {
            let _ = tray.set_icon(Some(icon));
        }
    } else {
        let tooltip = format!("桃園即時通 v{}", env!("CARGO_PKG_VERSION"));
        let _ = tray.set_tooltip(Some(&tooltip));
        if let Ok(icon) = Image::from_bytes(NORMAL_ICON_BYTES) {
            let _ = tray.set_icon(Some(icon));
        }
    }

    Ok(())
}
