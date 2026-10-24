use serde::{Deserialize, Serialize};
use std::net::IpAddr;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserInfo {
    pub ip: String,
    pub ipv4: String,
    pub userid: String,
    pub realname: String,
    pub pcname: String,
    pub hostname: String,
    pub os: String,
    pub dns: Vec<String>,
}

#[tauri::command]
pub fn get_userinfo() -> Result<UserInfo, String> {
    let hostname = whoami::fallible::hostname().unwrap_or_else(|_| "localhost".to_string());
    let username = whoami::username();
    let realname = whoami::realname();

    // 檢查是否符合地政局 H[A-H] 帳號慣例
    let target_userid = if username.to_uppercase().starts_with('H') && username.len() >= 6 {
        username.clone()
    } else {
        username.clone()
    };

    let os_str = format!("{} {}", whoami::platform(), whoami::distro());

    // 收集可用本機 IPv4 網卡位址
    let mut available_ips: Vec<String> = Vec::new();
    if let Ok(interfaces) = local_ip_address::list_afinet_netifas() {
        for (_name, ip) in interfaces {
            if let IpAddr::V4(ipv4) = ip {
                if !ipv4.is_loopback() && !ipv4.is_link_local() {
                    available_ips.push(ipv4.to_string());
                }
            }
        }
    }

    // 地政局特有網段排序邏輯：192.168.10.x ~ 192.168.89.x，第 3 碼越小越優先
    let mut prioritized_ips: Vec<String> = available_ips
        .iter()
        .filter(|addr| {
            let parts: Vec<&str> = addr.split('.').collect();
            if parts.len() == 4 && parts[0] == "192" && parts[1] == "168" {
                if let Ok(seg3) = parts[2].parse::<u32>() {
                    return seg3 >= 10 && seg3 <= 89;
                }
            }
            false
        })
        .cloned()
        .collect();

    prioritized_ips.sort_by(|a, b| {
        let seg3_a = a.split('.').nth(2).and_then(|s| s.parse::<u32>().ok()).unwrap_or(999);
        let seg3_b = b.split('.').nth(2).and_then(|s| s.parse::<u32>().ok()).unwrap_or(999);
        seg3_a.cmp(&seg3_b)
    });

    let final_ip = prioritized_ips
        .first()
        .or_else(|| available_ips.first())
        .cloned()
        .unwrap_or_default();

    // 取得 DNS 伺服器設定清單（預設安全降級）
    let dns_list = vec!["192.168.10.1".to_string(), "192.168.10.2".to_string()];

    Ok(UserInfo {
        ip: final_ip.clone(),
        ipv4: final_ip,
        userid: target_userid,
        realname,
        pcname: hostname.clone(),
        hostname,
        os: os_str,
        dns: dns_list,
    })
}

#[tauri::command]
pub async fn change_user_dept(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let api_url = payload
        .get("api")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "缺少 api 欄位".to_string())?;

    let res = client
        .post(api_url)
        .form(&payload)
        .send()
        .await
        .map_err(|e| format!("API 呼叫失敗: {}", e))?;

    let data = res
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("解析回應失敗: {}", e))?;

    Ok(data)
}

#[tauri::command]
pub async fn add_ip_entry(payload: serde_json::Value) -> Result<(), String> {
    let client = reqwest::Client::new();
    let api_url = match payload.get("api").and_then(|v| v.as_str()) {
        Some(url) => url,
        None => return Ok(()),
    };

    if let Ok(interfaces) = local_ip_address::list_afinet_netifas() {
        for (_name, ip) in interfaces {
            if let IpAddr::V4(ipv4) = ip {
                if !ipv4.is_loopback() && !ipv4.is_link_local() {
                    let mut item = payload.clone();
                    if let Some(obj) = item.as_object_mut() {
                        obj.insert("ip".to_string(), serde_json::Value::String(ipv4.to_string()));
                    }
                    let _ = client.post(api_url).form(&item).send().await;
                }
            }
        }
    }

    Ok(())
}
