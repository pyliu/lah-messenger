use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::time::Duration;
use serde::Deserialize;
use tauri::{AppHandle, Emitter, Manager, UserAttentionType, WebviewWindow};

static FLASH_GENERATION: AtomicU64 = AtomicU64::new(0);
static IS_FLASHING: AtomicBool = AtomicBool::new(false);

const BASE_INTERVAL_SECS: u64 = 10;
const MAX_INTERVAL_SECS: u64 = 120;
const BACKOFF_MULTIPLIER: u64 = 2;

pub fn stop_flashing_internal(window: &WebviewWindow) {
    FLASH_GENERATION.fetch_add(1, Ordering::SeqCst);
    IS_FLASHING.store(false, Ordering::SeqCst);
    let _ = window.request_user_attention(None);
}

pub fn start_flashing_internal(window: WebviewWindow) {
    if window.is_focused().unwrap_or(false) {
        return;
    }

    let current_generation = FLASH_GENERATION.fetch_add(1, Ordering::SeqCst) + 1;
    IS_FLASHING.store(true, Ordering::SeqCst);

    // 若視窗完全不可見（例如最小化至系統匣），將其設為最小化並顯示於工作列，絕不彈出主視窗或強奪焦點
    if !window.is_visible().unwrap_or(false) {
        let _ = window.minimize();
        let _ = window.show();
    }

    // 立即觸發第一次工作列閃爍
    let _ = window.request_user_attention(Some(UserAttentionType::Critical));

    // 啟動類似 TCP 指數退避演算法的背景提醒排程任務（使用標準 OS 原生執行緒，零 Tokio 上下文依賴）
    let win_clone = window.clone();
    std::thread::spawn(move || {
        let mut interval_secs = BASE_INTERVAL_SECS;

        loop {
            // 切分成 500ms 片段進行睡眠，確保世代改變或終止時能在 0.5 秒內立即感應退出
            let loops = interval_secs * 2;
            for _ in 0..loops {
                std::thread::sleep(Duration::from_millis(500));
                if FLASH_GENERATION.load(Ordering::SeqCst) != current_generation || !IS_FLASHING.load(Ordering::SeqCst) {
                    return;
                }
            }

            // 若使用者已點入視窗取得焦點，自動停止退避重試
            if win_clone.is_focused().unwrap_or(false) {
                stop_flashing_internal(&win_clone);
                return;
            }

            // 重新在工作列閃爍（先停止再啟用，產生重啟閃爍之視覺效果）
            let _ = win_clone.request_user_attention(None);
            std::thread::sleep(Duration::from_millis(150));

            if FLASH_GENERATION.load(Ordering::SeqCst) != current_generation || !IS_FLASHING.load(Ordering::SeqCst) {
                return;
            }
            let _ = win_clone.request_user_attention(Some(UserAttentionType::Critical));

            // 計算下一次退避時間（以 2 倍遞增，上限 120 秒）
            interval_secs = std::cmp::min(interval_secs * BACKOFF_MULTIPLIER, MAX_INTERVAL_SECS);
        }
    });
}

#[derive(Deserialize)]
pub struct ShowWindowPayload {
    pub top: Option<bool>,
}

#[derive(Deserialize)]
pub struct MessageBoxPayload {
    pub r#type: Option<String>,
    pub title: Option<String>,
    pub message: Option<String>,
    pub detail: Option<String>,
    pub browser: Option<bool>,
    #[serde(rename = "statusOnly")]
    pub status_only: Option<bool>,
    #[allow(dead_code)]
    pub block: Option<bool>,
}

#[tauri::command]
pub fn show_window(window: WebviewWindow, payload: Option<ShowWindowPayload>) -> Result<(), String> {
    let _ = window.show();
    let _ = window.unminimize();
    if let Some(p) = payload {
        if p.top.unwrap_or(false) {
            let _ = window.set_always_on_top(true);
        }
    }
    let _ = window.set_focus();
    Ok(())
}

#[tauri::command]
pub fn set_title(window: WebviewWindow, title: String) -> Result<(), String> {
    if !title.is_empty() && title.to_lowercase() != "undefined" && title.to_lowercase() != "null" {
        let _ = window.set_title(&title);
    }
    Ok(())
}

#[tauri::command]
pub fn show_message_box(window: WebviewWindow, payload: MessageBoxPayload) -> Result<(), String> {
    if payload.browser.unwrap_or(false) {
        let combined = if let Some(detail) = &payload.detail {
            if detail.is_empty() {
                payload.message.clone().unwrap_or_default()
            } else {
                format!("{} - {}", payload.message.as_deref().unwrap_or_default(), detail)
            }
        } else {
            payload.message.clone().unwrap_or_default()
        };

        let event_payload = serde_json::json!({
            "message": combined,
            "type": payload.r#type.unwrap_or_else(|| "info".to_string()),
            "title": payload.title.unwrap_or_else(|| "📢 訊息".to_string()),
            "statusOnly": payload.status_only.unwrap_or(false)
        });

        let _ = window.emit("in-browser-notify", event_payload);
    } else {
        let title = payload.title.unwrap_or_else(|| "📢 訊息".to_string());
        let message = payload.message.unwrap_or_else(|| "請輸入訊息".to_string());
        tauri_plugin_dialog::DialogExt::dialog(window.app_handle())
            .message(message)
            .title(title)
            .show(|_| {});
    }
    Ok(())
}

#[tauri::command]
pub fn flash_frame(window: WebviewWindow, flag: Option<bool>) -> Result<(), String> {
    let should_flash = flag.unwrap_or(true);
    if should_flash {
        start_flashing_internal(window);
    } else {
        stop_flashing_internal(&window);
    }
    Ok(())
}

#[tauri::command]
pub fn send_notification(app: AppHandle, _payload: serde_json::Value) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("main") {
        start_flashing_internal(win);
    }
    Ok(())
}

#[tauri::command]
pub fn reload_window(window: WebviewWindow) -> Result<(), String> {
    let _ = window.eval("window.location.reload()");
    Ok(())
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.cleanup_before_exit();
    std::process::exit(0);
}

#[tauri::command]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
pub fn home_ready() {
    println!("Renderer process is ready in Tauri runtime.");
}
