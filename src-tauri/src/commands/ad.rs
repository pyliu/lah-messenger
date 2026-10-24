use ldap3::{LdapConnAsync, Scope, SearchEntry};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct AdQueryConfig {
    pub url: String,
    #[serde(rename = "baseDN")]
    pub base_dn: String,
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AdUserResult {
    pub description: String,
    pub group: String,
}

#[tauri::command]
pub async fn ad_user_query(config: AdQueryConfig) -> Result<AdUserResult, String> {
    // 開發測試環境降級模擬
    #[cfg(debug_assertions)]
    if config.username.starts_with("test") {
        return Ok(AdUserResult {
            description: "測試使用者".to_string(),
            group: "inf".to_string(),
        });
    }

    let url = config.url.trim();
    let (conn, mut ldap) = LdapConnAsync::new(url)
        .await
        .map_err(|e| format!("LDAP 連線失敗 ({}): {}", url, e))?;
    
    ldap3::drive!(conn);

    ldap.simple_bind(&config.username, &config.password)
        .await
        .map_err(|e| format!("LDAP 認證通訊失敗: {}", e))?
        .success()
        .map_err(|e| format!("LDAP 帳號或密碼錯誤: {}", e))?;

    let s_am_account_name = config.username.split('@').next().unwrap_or(&config.username);
    let filter = format!("(&(objectCategory=person)(objectClass=user)(sAMAccountName={}))", s_am_account_name);

    let (rs, _res) = ldap
        .search(
            &config.base_dn,
            Scope::Subtree,
            &filter,
            vec!["description", "displayName", "memberOf", "cn"],
        )
        .await
        .map_err(|e| format!("LDAP 搜尋通訊失敗: {}", e))?
        .success()
        .map_err(|e| format!("LDAP 查詢錯誤: {}", e))?;

    if rs.is_empty() {
        return Err(format!("找不到使用者帳號: {}", s_am_account_name));
    }

    let entry = SearchEntry::construct(rs[0].clone());
    let description = entry
        .attrs
        .get("description")
        .and_then(|v| v.first())
        .or_else(|| entry.attrs.get("displayName").and_then(|v| v.first()))
        .cloned()
        .unwrap_or_else(|| s_am_account_name.to_string());

    // 課室群組對應字典
    let group_mappings: [(&str, &str); 7] = [
        ("資訊課", "inf"),
        ("登記課", "reg"),
        ("地價課", "val"),
        ("行政課", "adm"),
        ("測量課", "sur"),
        ("人事室", "hr"),
        ("會計室", "acc"),
    ];

    let mut user_group = "hr".to_string();
    if let Some(member_of) = entry.attrs.get("memberOf") {
        for (g_name, g_code) in group_mappings.iter() {
            if member_of.iter().any(|m| m.contains(g_name)) {
                user_group = (*g_code).to_string();
                break;
            }
        }
    }

    let _ = ldap.unbind().await;

    Ok(AdUserResult {
        description,
        group: user_group,
    })
}
