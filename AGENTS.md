# lah-messenger — 桃園即時通桌面端（Tauri 2 + Nuxt 2）規範

> **專案架構**：底層為 `src-tauri/`（Rust 2021 + Tauri v2），前端為 `renderer/`（Nuxt 2.15.8 / Vue 2 / BootstrapVue 2.18），透過 `renderer/plugins/electron-shim.js` 將前端 `ipcRenderer.invoke` / `on` 透明映射至 Tauri v2（瀏覽器環境自動降級為 Web Mock）。

---

## 1. 視窗、生命週期與存取控制防線

1. **視窗尺寸硬約束**：
   - 寬度鎖定 `490px`、高度鎖定 `740px`；強制 `resizable: false`、`maximizable: false`、`fullscreen: false`。
   - 首頁 `pages/home.vue` 採「容器 + `components/` 子元件 + `mixins/` 專責模組」架構，單一檔案維持在 600 行以內。
2. **關閉隱藏至系統匣與單一實例（Single Instance）**：
   - 點擊右上角關閉（`CloseRequested`）或最小化時，**嚴禁退出行程**，必須呼叫 `api.prevent_close()` 並執行 `window.hide()` 收入系統匣（Tray 左鍵切換顯隱、未讀時閃爍工作列 `request_user_attention`）。
   - 啟動第二個實例時自動喚醒既有視窗並置頂（`restore` + `show` + `set_focus`）。
3. **外部瀏覽器導向 vs. 內部 WebView 路由防線**：
   - 聊天室訊息內的外部 HTTP/HTTPS 與 LAN 連結，必須呼叫系統預設瀏覽器於外部開啟。
   - 內部導航（返回頻道、公告／通知／私訊頁籤切換、錨點如 `http://tauri.localhost/home#`）**必須留在 WebView 內部處理**，嚴禁全域攔截誤開系統瀏覽器。
4. **權限與公務帳號白名單防線**：
   - **頻道切換權限**：通知頁籤中的頻道切換與部門頻道切換僅限管理員（Admin）操作，一般使用者強制禁止切換。
   - **八個所公務帳號白名單**：登入帳號以正規表達式限制 `H[A-H]\d+` 格式，嚴格阻擋 `ADMINISTRATOR` 等本機管理員帳號在未登入狀態下誤啟動。
   - **伺服器輪迴探活（Failover）**：維護 9 組地政事務所伺服器 IP 陣列，斷線時依序自動探活，不寫死單一伺服器。

---

## 2. Rust 安全準則與 IPC 介面契約

- **Rust 編程護欄**：嚴禁非必要 `unsafe`；耗時網路操作（AD LDAP、HTTP 轉發）必須使用 `async` / Tokio 避免阻塞 UI；`open_explorer` 必須先剝除首尾引號並驗證路徑合法性以防引數注入；錯誤統一回傳 `Result<T, String>`。
- **IPC 向下相容契約**（前端一律經由 `electron-shim.js` 呼叫，嚴禁在 Vue 元件直接引入 Tauri 原生型別或更改指令／欄位名稱）：
  - `ad-user-query` (`ad_user_query`)、`userinfo` (`get_userinfo`)、`change-user-dept` (`change_user_dept`)、`add-ip-entry` (`add_ip_entry`)、`open-explorer` (`open_explorer`)、`open-image` (`open_image`)、`show-window` (`show_window`)、`title` (`set_title`)、`show-message-box` (`show_message_box`)、`notification` (`send_notification`)、`toggleUnreadTrayIcon` (`toggle_unread_tray_icon`)、`reload` (`reload_window`)、`quit` (`quit_app`)、`version` (`get_version`)、`home-ready` (`home_ready`)。

---

## 3. 常用驗證與建置指令

- **Rust 檢查與單元測試**：`cargo check --manifest-path src-tauri/Cargo.toml`、`cargo test --manifest-path src-tauri/Cargo.toml`
- **前端靜態生成驗證**：`npm run generate:nuxt`
- **開發熱重載／正式打包**：`npm run tauri:dev`、`npm run tauri:build`（打包前須確認授權）
