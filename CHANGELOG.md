# 桃園地政信差服務即時通 (lah-messenger) 版本修改歷程

本文件記錄桃園即時通各版本的重大功能更新、架構調整與問題修復歷程。

---

## [v1.6.1] - 2026-10-29

### 🌐 全縣八所即時通伺服器多候選陣列與智慧自動探活容錯切換 (Failover)
- **多主機候選陣列架構**：
  - `renderer/store/index.js`: 重構 `tySvrIp` 為全域候選陣列，桃園所 (`HA`) 預設支援 `['220.1.34.18', '220.1.34.75']`（優先嘗試新伺服器 `.18`，相容既有主機 `.75`），其餘七所亦全面改以陣列定義，支援未來伺服器平滑熱遷移。
- **身分前綴智慧轄區判定與候選解析**：
  - `renderer/plugins/global-vue-mixin.js`: 增強 `site` 判斷邏輯，優先以同仁公務帳號前綴（如 `HA10013859` -> `HA`）定位轄區，次依本機 IP 網段判定；`candidateSvrIps` 提供當前轄區所有備援候選 IP，並自動保留使用者自訂之主機。
- **3.5 秒快速探活與自動輪轉切換**：
  - `renderer/mixins/home-ws.js`: 引入連線逾時監控（3.5 秒）與錯誤事件攔截。當原伺服器無法連線或逾時無回應時，自動且無縫嘗試下一個備援主機；連線成功時自動記憶新 IP 至 `localForage` 快取並同步更新 `apiHost`。
- **全數斷線防護與即時手動設定**：
  - `renderer/components/home-login.vue`: 當所屬轄區所有候選 IP 均探測失敗時，登入卡片顯示醒目紅色警示（列出已嘗試 IP 清單），並提供「手動設定」按鈕與專屬設定彈窗，同仁可即時輸入伺服器 IP 與 Port 立即連線。

### 🛡️ 地政八所正式公務帳號嚴格限制與非正式登入阻擋 (H[A-H] 開頭搭配數字)
- **Rust 系統層帳號探測限制**：
  - `src-tauri/src/commands/sysinfo.rs`: 重構 `get_userinfo`，自動過濾 Windows 網域前綴，嚴格校驗帳號是否符合桃園地政八所公務帳號慣例（以 `H[A-H]` 開頭且後續全為數字，例如 `HA10013859`, `HA060033`, `HA0541`, `HB0541` 等）。若為非正式帳號（如安裝維護常見之內建 `ADMINISTRATOR`、管理者 `ha-admin`、系統或訪客帳號），原生層清空 `target_userid` 與 `realname`，防止底層帶入無效身分。
- **前端驗證與自動連線全面防護**：
  - `renderer/mixins/home-auth.js`:
    - `validAdAccount`: 導入正規表達式 `/^H[A-H]\d+$/i` 檢驗，非八所正式帳號判定為無效；若經管理員手動模式登入（`manualLogin` / `isAdminLogin`）則予以放行以利除錯。
    - `setUserInfo`: 遇到非正式帳號時，阻斷寫入 localForage 快取、阻斷 WebSocket 自動註冊 (`register()`)、阻斷後端 AD 課室查詢，並中止排程自動連線 (`triggerAutoConnect()`)；同時過濾 Windows 原生內建管理員描述（如「管理電腦/網域的內建帳戶」）。
    - `restoreSettings`: 啟動時主動校驗並清除本機快取中殘留的非正式帳號與系統描述，防止舊安裝快取污染。
- **WebSocket 註冊迴圈防護**：
  - `renderer/mixins/home-ws.js`: 於 `register()` 加入身分防呆，非正式帳號直接中止註冊，避免每 400ms 重試造成無效迴圈。
- **登入畫面即時視覺警示與防呆**：
  - `renderer/components/home-login.vue`: 登入卡片新增非正式帳號警告提示（黃色警示）與未偵測到公務帳號提示（灰色資訊）；非正式帳號時「進入即時通」按鈕自動鎖定禁用。
  - `renderer/pages/home.vue`: 串接傳遞 `:valid-ad-account="validAdAccount"` 狀態至登入元件。

### 🧹 NSIS 安裝流程整合舊版 Electron 混合優雅卸載與全面清理
- **混合優雅卸載舊版**：
  - `src-tauri/hooks.nsh`: 於 `NSIS_HOOK_PREINSTALL` 新增舊版 Electron (`lah-messenger`) 靜默卸載機制。優先讀取 HKCU 登錄檔之 `UninstallString` 執行靜默卸載 (`/S`)；若登錄機碼遺失但實體卸載執行檔存在，自動呼叫 `%LOCALAPPDATA%\Programs\lah-messenger\Uninstall lah-messenger.exe` 卸載。
- **主程式殘留與無效捷徑深度清理**：
  - `src-tauri/hooks.nsh`: 自動清除 `%LOCALAPPDATA%\Programs\lah-messenger` 舊程式目錄（嚴格保留 `%APPDATA%\lah-messenger` 與 LocalForage 之通訊歷史與個人設定）；清理使用者桌面殘留之 `$DESKTOP\lah-messenger.lnk`、開始功能表舊捷徑與資料夾、以及各項開機啟動登錄項。
- **卸載流程對齊清理**：
  - `src-tauri/hooks.nsh`: 於 `NSIS_HOOK_POSTUNINSTALL` 補充移除 `$DESKTOP\lah-messenger.lnk` 與舊版 Run 登錄機碼，確保系統卸載乾淨不留痕跡。

### 🐛 全新安裝或腳本重裝同仁姓名智慧解析修復
- **修復 API 響應結構欄位讀取**：
  - `renderer/mixins/home-auth.js`: 修正 `loadApiADUserData()` 讀取 `ad_user_info` 時僅存取 `data.data` 的問題，改為相容 `data.raw || data.data`，確保從後端正確取得 AD 中文姓名與課室。
- **放寬身分姓名覆蓋條件**：
  - `renderer/mixins/home-auth.js`: 於 `loadApiADUserData()` 與錯誤回退處，放寬判斷條件（當目前姓名為帳號代碼或尚未包含中文時允許覆蓋），解決開機初次抓到英數帳號（如 `HA10013859`）後阻擋真實中文姓名更新的問題。
- **員工對照表響應監聽與快取鍵名統一**：
  - `renderer/mixins/home-auth.js`: 新增 `userMap` 響應式 watcher，並於 `loadUserMapData()` 下載完成後自動補正中文姓名，同時雙向寫入 `userMap` 與 `userMapping` 快取。
  - `renderer/pages/home.vue`: 統一快取讀取為 `userMap` 並向下相容 `userMapping`，確保冷啟動時能即時命中本機員工對照表快取。
- **啟動快取還原防護**：
  - `renderer/mixins/home-auth.js`: `restoreSettings()` 中加入非空檢查，防止全新安裝本機快取為空時將已由原生系統探測到的帳號與姓名沖刷為 null 或「請更新」。

### 🚀 開機自動啟動全域支援與舊版殘留清理
- **跨安裝格式自啟動支援**：
  - `src-tauri/Cargo.toml`: 引入 `tauri-plugin-autostart = "2"` 外掛。
  - `src-tauri/src/main.rs`: 註冊 autostart 外掛並於啟動時主動偵測及啟用開機自動啟動（寫入 `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`），使 NSIS 與 MSI 安裝包均具備一致的開機自啟動能力。
  - `src-tauri/capabilities/default.json`: 加入 `autostart:default` 權限宣告。
- **安裝與解除安裝腳本清理**：
  - `src-tauri/hooks.nsh`: 安裝前主動清理舊版 Electron 遺留的登錄檔啟動項目（`electron.app.*`）；安裝後移除舊版 `$SMSTARTUP` 啟動資料夾捷徑，改由登錄檔統一管理以防重複啟動。

### 📦 打包發布配置升級 (支援 MSI 並拔除 WebView2 內嵌安裝)
- **多格式安裝包支援**：
  - `src-tauri/tauri.conf.json`: `bundle.targets` 加入 `"msi"`，配置 WiX 繁體中文語系（`zh-TW`），並將 `webviewInstallMode` 設為 `skip`，安裝包不再內嵌約 130MB 的 WebView2 離線安裝程式，以維持安裝檔精簡。
  - `src-tauri/installer.nsi`: 於 `skip` 模式且本機未偵測到 WebView2 時，顯示不中斷安裝的安裝說明提示（靜默安裝自動略過、更新模式不顯示）。WebView2 安裝檔由管理單位另行提供。
- **發布產物複製腳本擴充**：
  - `scripts/copy-dist.js`: 支援同時掃描並複製 NSIS (`.exe`) 與 WiX (`.msi`) 安裝檔至專案根目錄 `dist/`，並自動清理舊版本同類型安裝包。

---

## [v1.6.0] - 2026-10-24

### 🛡️ AD 主機離線智慧身分平滑降級
- **動態狀態響應**：自後端 API（`authentication`）讀取 `ad_available` 狀態，當 AD 離線或未啟用時，自動跳過發送遠端 `ad_user_info` 請求，改由本機員工對照表（`userMap`）與 Windows 帳號解析姓名與課室。
- **免等待一鍵登入**：徹底消除在無 AD 環境下的 LDAP 連線逾時與 API 錯誤記錄，確保即時通一鍵登入維持即時、順暢。
- **安全防護**：管理模式下點擊 AD 網域驗證時，若 AD 離線則即時防呆提示，避免前端無回應。

### 🧩 首頁模組化重構與架構精煉
- **模組化拆分**：將原逾 1,800 行之 `renderer/pages/home.vue` 主頁面精煉拆分為組裝容器（約 540 行）、獨立登入子元件 `renderer/components/home-login.vue` 與 5 大專責 Mixins（`home-ws.js`、`home-auth.js`、`home-desktop.js`、`home-input.js`、`home-status-queue.js`），大幅降低維護者的心智負擔。
- **介面與行為 100% 相容**：保留既有 Flexbox 佈局約束、輸入框 autofocus、按鍵歷史快顯、浮動即時預覽與工作列橘色閃爍，並經由 `yarn generate:nuxt` 驗證靜態建置與打包完全無誤。
- **技術文件規格更新**：全新改寫 `renderer/pages/home.vue.md` 為完整系統架構地圖規格書（包含 Mermaid 拓撲圖與各模組 API 規格），並同步更新 `AGENTS.md` 與 `README.md`。

### 🛡️ 附件上傳防呆驗證與錯誤回報強化
- **前置格式與大小檢驗**：定義 43 種公務副檔名白名單與單檔 10MB 大小上限，選檔時立即進行前置防呆，有效防禦 `.gitignore`、`.gitconfig` 等無副檔名或特殊隱藏檔案。
- **結構化錯誤引導彈窗**：新增 `showAttachmentError` 方法，當選取不支援格式或伺服器拒絕上傳時，彈出清楚列出允許格式清單與大小上限的結構化對話框，並發出 10 秒長效通知。
- **編輯對話框非同步等待**：改造訊息與公告編輯視窗中之附件上傳流程為循序非同步等待（`await`），上傳期間按鈕呈現 Spinner 載入狀態，上傳失敗時保留視窗與未成功檔案供使用者修正重試。

### 🚀 重大架構升級 (Rust + Tauri v2)
- **架構遷移**：底層自 Electron 完整遷移至 **Rust + Tauri v2** 原生架構，大幅降低記憶體占用至約 40MB，安裝包體積縮減至約 4.8MB，提升冷啟動速度。
- **透明 IPC 橋接**：實作 `renderer/plugins/electron-shim.js`，將前端 Vue 元件中既有的 `ipcRenderer` 呼叫透明轉發至 Tauri 原生命令（Commands），既有業務畫面與邏輯零改動無縫相容。
- **純 Rust 非同步 LDAP**：採用 `ldap3` 函式庫實作 Active Directory 驗證與課室群組分類，移除外部 Node 原生 C++ 模組依賴。
- **系統資訊原生整合**：採用 `sysinfo` 與 `local-ip-address` 原生查詢主機名稱、登入帳號、MAC 位址與 IPv4，並優先排序地政內部專屬網段（192.168.10.x ~ 89.x）。

### 🛠️ 登入與安全體驗重構
- **身分防呆與課室鎖定**：自動比對 Windows 登入帳號與 AD 查詢之所屬課室，若選擇之課室與實際組織不符時自動鎖定，防止使用者誤選其他課室登入。
- **管理者通行碼機制**：提供課室登入覆蓋解鎖機制，需輸入指定管理通行碼（`033695588`）方可手動變更課室。
- **多重網卡優先序**：在多網卡或虛擬網卡環境下，自動優先識別 192.168.10.x 至 89.x 之地政核心內部網路 IP。

### 💬 訊息提醒與通知體驗優化
- **非侵入式訊息提醒**：取消收到訊息時強行彈出主視窗搶奪焦點的行為，改為觸發原生 Windows 工作列圖示閃爍提醒。
- **TCP 指數退避排程提醒**：若持續有未讀訊息且使用者未點擊讀取，系統依據類似 TCP 指數退避演算法（初始間隔約 1.5 秒，逐步拉長至最大約 60 秒）定期於背景喚醒工作列閃爍，避免過度干擾同時確保公務通知不漏接。
- **系統匣未讀紅點提示**：當有未讀訊息時，系統匣（Tray）圖示自動切換至右上角標註鮮紅圓點之通知圖示（`message_notice.ico`），使用者讀取所有訊息後自動復原為標準圖示（`message.ico`）。

### 📦 安裝與打包流程完善
- **Nuxt 2 靜態路由修復**：新增 `renderer/pages/index.vue` 首頁跳轉元件，並於 `nuxt.config.js` 配置 `target: 'static'` 與 `fallback: 'index.html'`，徹底解決生產環境打包缺少 `index.html`（`asset not found: index.html`）的啟動錯誤。
- **NSIS 雙擊全自動安裝**：自訂 `src-tauri/installer.nsi` 範本，預設啟用 `PassiveMode`，跳過所有繁瑣的歡迎、目錄選擇與完成精靈視窗。使用者雙擊安裝檔後自動以非管理員權限安裝至 `%LOCALAPPDATA%\桃園地政信差服務即時通`，安裝進度完成後自動關閉安裝視窗並啟動主程式。
- **開機與捷徑自動配置**：於安裝階段自動在桌面、開始功能表以及使用者開機啟動資料夾（`$SMSTARTUP`）建立捷徑。
- **產物自動同步至 dist 目錄**：建立後處理腳本 `scripts/copy-dist.js`，執行 `yarn tauri:build` 時自動清理 `dist/` 舊檔，並將最新產出之 NSIS 安裝包複製至專案根目錄之 `dist/`，同時在終端顯示確認資訊與檔案大小。

---

## [v1.5.1] - 2026-10-22

### 🐛 問題修復
- **訊息路徑解析容錯**：修正訊息內容中若本機路徑或 UNC 網路共享路徑末尾未帶反斜線（`\`）時，結尾字元遭截斷導致超連結失效的問題。
- **檔案總管向上尋找導航**：點擊訊息中之檔案或資料夾路徑時，若目標路徑不存在，自動向上層目錄逐層尋找最近一層存在之父資料夾並以 `explorer.exe` 開啟，避免 Windows 跳出網路錯誤中斷使用者操作。

---

## [v1.5.0] - 2026-10-21

### ✨ 新增功能
- **歷史訊息記憶與快速填入**：聊天室訊息輸入框新增記憶最近 10 筆已送出訊息功能。使用者可在輸入框按鍵盤「上」鍵開啟歷史選單，按 Enter 快速填入，大幅提升重複公務訊息的發送效率。
