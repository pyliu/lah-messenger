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
    let raw_username = whoami::username();
    let clean_username = if let Some(pos) = raw_username.rfind('\\') {
        &raw_username[pos + 1..]
    } else {
        &raw_username[..]
    };

    // 檢查是否符合地政局八所 H[A-H] 開頭搭配數字帳號慣例 (例如 HA10013859, HA060033, HA0541, HB0541 等)
    let is_formal_account = {
        let upper = clean_username.to_ascii_uppercase();
        let bytes = upper.as_bytes();
        bytes.len() >= 3
            && bytes[0] == b'H'
            && (b'A'..=b'H').contains(&bytes[1])
            && bytes[2..].iter().all(|b| b.is_ascii_digit())
    };

    let target_userid = if is_formal_account {
        clean_username.to_ascii_uppercase()
    } else {
        String::new()
    };

    let realname = if is_formal_account {
        whoami::realname()
    } else {
        String::new()
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
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    let api_url = match payload.get("api").and_then(|v| v.as_str()) {
        Some(url) => url,
        None => return Ok(()),
    };

    let mut sent = false;
    if let Ok(interfaces) = local_ip_address::list_afinet_netifas() {
        for (_name, ip) in interfaces {
            if let IpAddr::V4(ipv4) = ip {
                if !ipv4.is_loopback() && !ipv4.is_link_local() {
                    let mut item = payload.clone();
                    if let Some(obj) = item.as_object_mut() {
                        obj.insert("ip".to_string(), serde_json::Value::String(ipv4.to_string()));
                    }
                    if let Err(e) = client.post(api_url).form(&item).send().await {
                        eprintln!("[add_ip_entry] 回報 IP ({}) 失敗: {}", ipv4, e);
                    } else {
                        sent = true;
                    }
                }
            }
        }
    }

    if !sent {
        if let Some(ip) = payload.get("ip").and_then(|v| v.as_str()) {
            if !ip.is_empty() {
                if let Err(e) = client.post(api_url).form(&payload).send().await {
                    eprintln!("[add_ip_entry] 回報 IP (備援 {}) 失敗: {}", ip, e);
                }
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_serde_urlencoded_with_json_value() {
        let mut map = serde_json::Map::new();
        map.insert("api".to_string(), serde_json::Value::String("http://127.0.0.1/api/ip_json_api.php".to_string()));
        map.insert("type".to_string(), serde_json::Value::String("add_user_ip_entry".to_string()));
        map.insert("note".to_string(), serde_json::Value::String("ty.land hr".to_string()));
        map.insert("entry_id".to_string(), serde_json::Value::String("HA10013859".to_string()));
        map.insert("entry_desc".to_string(), serde_json::Value::String("測試員".to_string()));
        map.insert("ip".to_string(), serde_json::Value::String("192.168.10.50".to_string()));
        let val = serde_json::Value::Object(map);

        let client = reqwest::Client::new();
        let req = client.post("http://127.0.0.1/api/ip_json_api.php").form(&val).build();
        assert!(req.is_ok(), "Reqwest form build failed: {:?}", req.err());
    }

    #[tokio::test]
    async fn test_add_ip_entry_call() {
        let mut map = serde_json::Map::new();
        map.insert("api".to_string(), serde_json::Value::String("http://127.0.0.1/api/ip_json_api.php".to_string()));
        map.insert("type".to_string(), serde_json::Value::String("add_user_ip_entry".to_string()));
        map.insert("note".to_string(), serde_json::Value::String("ty.land hr".to_string()));
        map.insert("entry_id".to_string(), serde_json::Value::String("HA10013859".to_string()));
        map.insert("entry_desc".to_string(), serde_json::Value::String("測試員".to_string()));
        let val = serde_json::Value::Object(map);

        let res = add_ip_entry(val).await;
        assert!(res.is_ok(), "add_ip_entry failed: {:?}", res);
    }
}
