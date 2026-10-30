use base64::Engine;
use std::fs::File;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

#[tauri::command]
pub fn open_explorer(path: String) -> Result<(), String> {
    let mut target = path.trim().to_string();
    target = target
        .trim_matches(|c| c == '"' || c == '\'' || c == '`' || c == '<' || c == '>')
        .trim()
        .to_string();

    if target.is_empty() {
        return Ok(());
    }

    // 0. 若為 HTTP / HTTPS 網址，以系統預設瀏覽器開啟 (下載或瀏覽)
    if target.starts_with("http://") || target.starts_with("https://") || target.starts_with("mailto:") {
        // 防禦：嚴格排除 tauri.localhost 內部路徑，避免誤開啟外部瀏覽器
        if target.contains("tauri.localhost") {
            return Ok(());
        }
        if open::that_detached(&target).is_ok() {
            return Ok(());
        }
        let _ = Command::new("explorer.exe").arg(&target).spawn();
        return Ok(());
    }

    let p = Path::new(&target);
    let has_ext = p.extension().is_some();

    // 1. 若具有副檔名且實體檔案存在，優先嘗試以系統關聯預設軟體開啟
    if has_ext && p.is_file() {
        if open::that_detached(&target).is_ok() {
            return Ok(());
        }
    }

    // 2. 若為資料夾或檔案不存在，向上尋找最近一層存在之目錄開啟
    let mut current: Option<PathBuf> = if has_ext {
        p.parent().map(|p| p.to_path_buf())
    } else {
        Some(p.to_path_buf())
    };

    while let Some(dir) = current {
        if dir.is_dir() {
            let _ = Command::new("explorer.exe").arg(&dir).spawn();
            return Ok(());
        }
        current = dir.parent().map(|p| p.to_path_buf());
    }

    // 3. 若層層向上都無法確認（例如網路共用 UNC），交由 explorer.exe 嘗試解析開啟
    let _ = Command::new("explorer.exe").arg(&target).spawn();
    Ok(())
}

#[derive(serde::Deserialize)]
pub struct OpenImagePayload {
    pub src: Option<String>,
    #[allow(dead_code)]
    pub alt: Option<String>,
}

#[tauri::command]
pub fn open_image(payload: OpenImagePayload) -> Result<(), String> {
    let src = payload.src.ok_or_else(|| "缺少圖片來源".to_string())?;
    let parts: Vec<&str> = src.split(',').collect();
    if parts.len() != 2 {
        return Err("無效的 Base64 圖片資料".to_string());
    }

    let mime = parts[0];
    let base64_data = parts[1];
    let ext = if mime.contains("png") {
        ".png"
    } else if mime.contains("jpeg") || mime.contains("jpg") {
        ".jpg"
    } else if mime.contains("gif") {
        ".gif"
    } else {
        ".jpg"
    };

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_data)
        .map_err(|e| format!("Base64 解碼失敗: {}", e))?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();

    let temp_dir = std::env::temp_dir();
    let file_path = temp_dir.join(format!("lah_image_preview_{}{}", timestamp, ext));

    let mut file = File::create(&file_path).map_err(|e| format!("建立暫存檔案失敗: {}", e))?;
    file.write_all(&bytes).map_err(|e| format!("寫入暫存檔案失敗: {}", e))?;

    open::that_detached(&file_path).map_err(|e| format!("開啟圖片檢視器失敗: {}", e))?;
    Ok(())
}
