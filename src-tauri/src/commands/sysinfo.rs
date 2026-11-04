use serde::{Deserialize, Serialize};
use std::net::{IpAddr, Ipv4Addr, UdpSocket};

/// 常見虛擬網卡、容器、VPN 與隧道介面名稱黑名單關鍵字（小寫比對）
const VIRTUAL_INTERFACE_KEYWORDS: &[&str] = &[
    "vmware",
    "vmnet",
    "vethernet",
    "wsl",
    "hyper-v",
    "virtualbox",
    "vbox",
    "docker",
    "tailscale",
    "zerotier",
    "wireguard",
    "tap",
    "tun",
    "npcap",
    "bluetooth",
    "loopback",
    "teredo",
    "isatap",
    "vpn",
    "radmin",
    "hamachi",
];

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

/// 判斷網卡名稱或 IPv4 位址是否屬於虛擬網卡或無效通訊端點
pub fn is_virtual_or_invalid_interface(name: &str, ipv4: Ipv4Addr) -> bool {
    if ipv4.is_loopback() || ipv4.is_link_local() || ipv4.is_unspecified() || ipv4.is_broadcast() {
        return true;
    }

    let lower_name = name.to_ascii_lowercase();
    if VIRTUAL_INTERFACE_KEYWORDS
        .iter()
        .any(|kw| lower_name.contains(kw))
    {
        return true;
    }

    let octets = ipv4.octets();
    // 排除交換器閘道 (.254)
    if octets[3] == 254 {
        return true;
    }

    // 排除常見虛擬網卡預設 Host-Only / NAT 主機端點 (192.168.x.1，例如 VMware 17.1/86.1、VirtualBox 56.1 等)
    if octets[0] == 192 && octets[1] == 168 && octets[3] == 1 {
        if matches!(octets[2], 17 | 52 | 56 | 72 | 86 | 122 | 131 | 137) {
            return true;
        }
    }

    false
}

/// 判斷是否為地政局八所優先內部網段 (192.168.10.x ~ 192.168.89.x)
fn is_land_office_subnet(ipv4: Ipv4Addr) -> bool {
    let octets = ipv4.octets();
    octets[0] == 192 && octets[1] == 168 && (10..=89).contains(&octets[2])
}

/// 從 URL 字串提取 (host, port) 供 UDP 路由探測使用
fn extract_host_port_from_url(url: &str) -> Option<(String, u16)> {
    let without_scheme = url
        .strip_prefix("http://")
        .or_else(|| url.strip_prefix("https://"))
        .unwrap_or(url);
    let authority = without_scheme.split('/').next()?;
    if authority.is_empty() {
        return None;
    }
    if let Some((host, port_str)) = authority.rsplit_once(':') {
        let port = port_str.parse::<u16>().unwrap_or(80);
        Some((host.to_string(), port))
    } else {
        let default_port = if url.starts_with("https://") { 443 } else { 80 };
        Some((authority.to_string(), default_port))
    }
}

/// 透過零封包 UDP Socket 綁定探測作業系統連往目標主機所使用的本機出站 IPv4 位址
pub fn probe_outbound_ipv4(target_url: Option<&str>) -> Option<Ipv4Addr> {
    let mut targets: Vec<(String, u16)> = Vec::new();
    if let Some(url) = target_url {
        if let Some((host, port)) = extract_host_port_from_url(url) {
            if host != "localhost" && host != "127.0.0.1" {
                targets.push((host, port));
            }
        }
    }
    // 預設地政局核心伺服器與內部 DNS 作為路由探測備援目標
    targets.push(("220.1.34.75".to_string(), 80));
    targets.push(("220.1.34.18".to_string(), 80));
    targets.push(("192.168.10.1".to_string(), 53));

    for (host, port) in targets {
        if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
            if socket.connect((host.as_str(), port)).is_ok() {
                if let Ok(local_addr) = socket.local_addr() {
                    if let IpAddr::V4(ipv4) = local_addr.ip() {
                        if !ipv4.is_loopback() && !ipv4.is_unspecified() {
                            return Some(ipv4);
                        }
                    }
                }
            }
        }
    }
    None
}

/// 從本機網卡清單與出站路由探測結果中，遴選出唯一「有效公務網卡位址 (Effective Office NIC Address)」
pub fn select_effective_office_ip(
    interfaces: &[(String, IpAddr)],
    outbound_ip: Option<Ipv4Addr>,
) -> String {
    let mut valid_ipv4s: Vec<Ipv4Addr> = Vec::new();

    for (name, ip) in interfaces {
        if let IpAddr::V4(ipv4) = *ip {
            if !is_virtual_or_invalid_interface(name, ipv4) && !valid_ipv4s.contains(&ipv4) {
                valid_ipv4s.push(ipv4);
            }
        }
    }

    // 1. 若 UDP 出站路由探測成功，且該位址通過虛擬網卡過濾且屬於地政局 192.168.[10..89].x 網段，最優先採用
    if let Some(out_ip) = outbound_ip {
        if valid_ipv4s.contains(&out_ip) && is_land_office_subnet(out_ip) {
            return out_ip.to_string();
        }
    }

    // 2. 地政局特有網段排序邏輯：192.168.10.x ~ 192.168.89.x，第 3 碼越小越優先
    let mut prioritized_ips: Vec<Ipv4Addr> = valid_ipv4s
        .iter()
        .copied()
        .filter(|ipv4| is_land_office_subnet(*ipv4))
        .collect();

    prioritized_ips.sort_by_key(|ipv4| ipv4.octets()[2]);

    if let Some(first_priority) = prioritized_ips.first() {
        return first_priority.to_string();
    }

    // 3. 若無 192.168.[10..89].x 網段，次優先採用通過虛擬網卡過濾的出站路由 IP
    if let Some(out_ip) = outbound_ip {
        if valid_ipv4s.contains(&out_ip) {
            return out_ip.to_string();
        }
    }

    // 4. 退回第一張非虛擬網卡之有效 IPv4
    valid_ipv4s
        .first()
        .map(|ip| ip.to_string())
        .unwrap_or_default()
}

/// 取得本機目前唯一的有效公務網卡位址
pub fn resolve_effective_office_ip(target_url: Option<&str>) -> String {
    let interfaces = local_ip_address::list_afinet_netifas().unwrap_or_default();
    let outbound_ip = probe_outbound_ipv4(target_url);
    select_effective_office_ip(&interfaces, outbound_ip)
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

    // 遴選排除虛擬網卡後的唯一有效公務網卡位址
    let final_ip = resolve_effective_office_ip(None);

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

    // 僅回報排除虛擬網卡後的唯一有效公務網卡位址（若無則退回 payload 既有 ip）
    let effective_ip = {
        let resolved = resolve_effective_office_ip(Some(api_url));
        if !resolved.is_empty() {
            resolved
        } else {
            payload
                .get("ip")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string()
        }
    };

    if !effective_ip.is_empty() {
        let mut item = payload.clone();
        if let Some(obj) = item.as_object_mut() {
            obj.insert("ip".to_string(), serde_json::Value::String(effective_ip.clone()));
        }
        if let Err(e) = client.post(api_url).form(&item).send().await {
            eprintln!("[add_ip_entry] 回報有效公務 IP ({}) 失敗: {}", effective_ip, e);
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    #[test]
    fn test_virtual_interface_filtering() {
        assert!(is_virtual_or_invalid_interface(
            "VMware Network Adapter VMnet8",
            Ipv4Addr::new(192, 168, 17, 1)
        ));
        assert!(is_virtual_or_invalid_interface(
            "VMware Network Adapter VMnet1",
            Ipv4Addr::new(192, 168, 86, 1)
        ));
        assert!(is_virtual_or_invalid_interface(
            "vEthernet (WSL)",
            Ipv4Addr::new(172, 22, 144, 1)
        ));
        assert!(is_virtual_or_invalid_interface(
            "VirtualBox Host-Only Network",
            Ipv4Addr::new(192, 168, 56, 1)
        ));
        assert!(is_virtual_or_invalid_interface(
            "乙太網路",
            Ipv4Addr::new(192, 168, 13, 254)
        ));
        assert!(!is_virtual_or_invalid_interface(
            "乙太網路",
            Ipv4Addr::new(192, 168, 13, 96)
        ));
    }

    #[test]
    fn test_select_effective_office_ip_with_multi_nic_and_vmware() {
        let interfaces = vec![
            (
                "乙太網路 3".to_string(),
                IpAddr::from_str("220.3.34.197").unwrap(),
            ),
            (
                "乙太網路 3".to_string(),
                IpAddr::from_str("192.168.34.197").unwrap(),
            ),
            (
                "VMware Network Adapter VMnet8".to_string(),
                IpAddr::from_str("192.168.17.1").unwrap(),
            ),
            (
                "VMware Network Adapter VMnet1".to_string(),
                IpAddr::from_str("192.168.86.1").unwrap(),
            ),
            (
                "乙太網路".to_string(),
                IpAddr::from_str("192.168.13.96").unwrap(),
            ),
        ];
        let outbound = Some(Ipv4Addr::new(192, 168, 13, 96));
        let selected = select_effective_office_ip(&interfaces, outbound);
        assert_eq!(selected, "192.168.13.96");
    }

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
