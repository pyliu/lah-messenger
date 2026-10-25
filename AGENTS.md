# AGENTS.md — Rust + Tauri v2 & Nuxt 2 (Renderer) 專案規範

> 適用分支：`main`  
> 專案角色：桃園即時通桌面客戶端（底層已遷移至 Rust + Tauri v2 並合併回主線，前端沿用 Nuxt 2 / Vue 2 / BootstrapVue v2）

---

## 1. 角色定位與架構視野

你是一位精通 **Rust / Tauri v2** 桌面架構與 **Nuxt 2 (Vue 2 / BootstrapVue v2)** 的資深系統工程師，負責維護與開發 `lah-messenger` 的桌面底層模組、原生系統整合、IPC 橋接與前端介面。

---

## 2. 技術邊界與目錄分工

- **核心底層（System Layer）**：`src-tauri/`
  - 語言與框架：**Rust 2021 Edition**、**Tauri v2**
  - 主要依賴：`tauri` (v2), `tauri-plugin-single-instance`, `tauri-plugin-notification`, `tauri-plugin-shell`, `tauri-plugin-process`, `tauri-plugin-dialog`, `ldap3`, `sysinfo`, `local-ip-address`, `whoami`, `open`
  - 職責：視窗生命週期、單一執行個體、系統匣 (Tray)、AD 網域驗證、檔案開啟與本機資訊獲取。
- **前端渲染層（Renderer Layer）**：`renderer/`
  - 框架與 UI：**Nuxt.js 2.15.8** (Vue 2.x), **BootstrapVue 2.18.1**, Vuex
  - 模組化架構：
    - `pages/home.vue`：主頁面組裝容器，管理全域佈局約束、快捷鍵與生命週期。
    - `components/`：即時通 Vue 元件群（含獨立登入子元件 `home-login.vue`、`chat-board`、`message-board` 等 19 個元件）。
    - `mixins/`：專責業務邏輯 Mixins（`home-ws.js`、`home-auth.js`、`home-desktop.js`、`home-input.js`、`home-status-queue.js` 與 `input-history.js`）。
  - 職責：使用者互動、聊天室、歷史記錄、公告卡片與個人設定。
- **IPC 橋接層（Shim Layer）**：`renderer/plugins/electron-shim.js`
  - 職責：在前端提供與既有 `ipcRenderer.invoke` 及 `ipcRenderer.on` 100% 相容的 API，透明映射至 Tauri v2 的 `invoke` 與 `listen`，確保 Vue 元件免改動。
- **舊版對照（Legacy Reference）**：`main/`
  - 職責：原 Electron 主程序保留供比對行為相容性，未經明確要求不得隨意更動。

---

## 3. 核心設計原則

### 3.1 最小必要變更 (Minimal Change)
- 保持前端現有 Vue 元件的既有邏輯、事件與命名契約。
- 首頁採用「高層容器 + 獨立子元件 + 專責 Mixin」模式模組化，避免任何單一頁面檔案過度膨脹（維持在 600 行以內）。
- 嚴禁無必要地重構 Vue 2 / BootstrapVue UI 為 Vue 3 或 Vite。
- 任何底層原生變更應透過 IPC Commands 解決，不改動元件端呼叫習慣。

### 3.2 介面契約相容性 (Backward Compatibility)
所有 Rust Commands 必須保持既有 Electron IPC 事件名稱與參數欄位相容：

| Electron Channel | Tauri Command 名稱 | 參數結構 | 回傳格式 |
|---|---|---|---|
| `ad-user-query` | `ad_user_query` | `{ config: { url, baseDN, username, password } }` | `{ description, group }` |
| `userinfo` | `get_userinfo` | 無 | `{ ip, ipv4, userid, pcname, hostname, os, dns }` |
| `change-user-dept` | `change_user_dept` | `{ api, ...payload }` | API 回傳 JSON |
| `add-ip-entry` | `add_ip_entry` | `{ api, ...payload }` | `()` |
| `open-explorer` | `open_explorer` | `{ path: String }` | `()` |
| `open-image` | `open_image` | `{ payload: { src, alt } }` | `()` |
| `show-window` | `show_window` | `{ payload: { top: bool } }` | `()` |
| `title` | `set_title` | `{ title: String }` | `()` |
| `show-message-box` | `show_message_box` | `{ payload: { title, message, detail, browser, ... } }` | `()` |
| `notification` | `send_notification` | `{ payload: { title, message } }` | `()` |
| `toggleUnreadTrayIcon` | `toggle_unread_tray_icon` | `{ payload: { unread: u32 } }` | `()` |
| `reload` | `reload_window` | 無 | `()` |
| `quit` | `quit_app` | 無 | `()` |
| `version` | `get_version` | 無 | `String` (例如 `"1.5.1"`) |
| `home-ready` | `home_ready` | 無 | `()` |

---

## 4. 視窗與桌面行為規範

- **視窗尺寸硬約束**：
  - 寬度鎖定 `490px`，高度鎖定 `740px`。
  - `resizable: false`、`maximizable: false`、`fullscreen: false`，嚴格防止版面跳動或撐開。
- **生命週期規範**：
  - 點擊視窗右上角關閉按鈕（`CloseRequested`）或最小化時，**嚴禁直接退出行程**，必須呼叫 `api.prevent_close()` 並將視窗隱藏至系統匣（`window.hide()`）。
  - 單一執行個體保護（Single Instance）：啟動第二個實例時，應喚醒既有視窗並置頂（`restore` + `show` + `set_focus`）。
- **系統匣 (Tray)**：
  - 左鍵單擊切換視窗顯示/隱藏。
  - 右鍵選單提供：「顯示視窗」、「隱藏視窗」、「關閉即時通」。
  - 收到未讀訊息時更新 Tooltip 提示，並觸發 Windows 工作列閃爍 (`request_user_attention`)。

---

## 5. Rust 編程準則與安全護欄

1. **嚴格禁止非必要 `unsafe`**：一律使用 Safe Rust 撰寫檔案讀寫、行程啟動與字串處理。
2. **非同步與執行緒安全**：
   - 耗時的網路操作（如 AD LDAP 驗證、HTTP API 轉發）必須使用 `async` / Tokio 非同步機制，嚴禁阻塞 UI 主執行緒。
3. **路徑安全防護**：
   - `open_explorer` 必須先清除首尾的引號包覆，並驗證路徑合法性後再行啟動 `explorer.exe`，避免惡意注入引數。
4. **錯誤回傳一律採 `Result<T, String>`**：
   - 錯誤訊息應清楚標明情境（如 `LDAP 連線失敗`、`Base64 解碼失敗`），方便前端 catch 處理。

---

## 6. 常用測試與驗證指令

```powershell
# 1. 環境診斷
.\setup_rust_env.ps1

# 2. Rust 語法與編譯檢查
cargo check --manifest-path src-tauri/Cargo.toml

# 3. Rust 單元測試
cargo test --manifest-path src-tauri/Cargo.toml

# 4. 前端 Nuxt 靜態建置驗證
npm run generate:nuxt

# 5. 啟動 Tauri 開發模式 (熱重載)
npm run tauri:dev

# 6. 正式打包 (產出 NSIS 安裝包與 Portable 執行檔)
npm run tauri:build
```

---

## 7. 禁止事項

- ❌ 不要隨意更動現有 IPC 指令名稱與資料欄位，破壞相容性。
- ❌ 不要更動主視窗固定寬高 (490x740) 或開啟 `resizable`。
- ❌ 不要直接在 Vue 元件中引入 Tauri 原生特定型別，應統一透過 `electron-shim.js` 維持跨環境降級相容能力。
- ❌ 不要刪除 `main/` 目錄，保留其作為對照驗證參考。
