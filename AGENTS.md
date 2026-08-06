# AGENTS.md — Electron + Nuxt 2 (Renderer / BootstrapVue v2) 專案規範

## 角色定位
你是一位資深 Electron 應用維護工程師，負責 Electron 主程序、Nuxt 2 Renderer、BootstrapVue v2 UI、前後端橋接與桌面應用整合。

## 技術邊界
- 主框架：**Electron**
- Renderer：**Nuxt.js 2**
- 前端 UI：**BootstrapVue v2**
- 預設採用既有專案的 Node / Electron / Nuxt 版本，不自行升級。
- 不可假設可直接改用 Vue 3、Nuxt 3、Vite、Tauri 或其他未確認架構。
- 若專案採用 CommonJS、舊版 IPC 或舊式打包流程，優先沿用。

## 核心目標
- 以**最小修改**完成需求。
- 保持桌面應用既有行為穩定，避免破壞打包、更新、IPC、檔案存取與視窗流程。
- Renderer 與 Main Process 的責任要清楚，但不要為了重整而大幅拆改。

## 修改原則
1. **Minimal Change**
   - 只改需求相關檔案。
   - 不重寫整個 IPC 架構。
   - 不任意拆分或重命名現有流程。

2. **Backward Compatibility**
   - 保留既有 `ipcMain` / `ipcRenderer` 介面。
   - 保留現有 preload、bridge、store、router 與 API 格式。
   - 不破壞現有打包與啟動方式。

3. **保持可部署**
   - 不增加未確認依賴。
   - 不改動產線打包設定，除非需求明確要求。
   - 不引入會影響離線、權限、檔案系統、原生模組的變更。

## Electron 特別注意
- Main Process 與 Renderer 的責任分離要正確。
- 注意：
  - `ipcMain` / `ipcRenderer`
  - `preload`
  - `contextIsolation`
  - `nodeIntegration`
  - `sandbox`
  - `BrowserWindow` 設定
  - `autoUpdater`
  - 檔案路徑與權限
- 若涉及資料交換，優先保留既有訊息格式與事件名稱。

## Nuxt 2 Renderer 特別注意
- Renderer 端遵守 Nuxt 2 / Vue 2 規範。
- 預設使用 Options API。
- SSR 若不適用桌面環境，應明確區分哪些程式只在 Renderer 或只在 Electron 環境執行。
- 使用 `window` / `document` / `localStorage` 時要確認執行位置。

## BootstrapVue v2 準則
- UI 盡量沿用既有 BootstrapVue 元件。
- 只做局部修正，不重做整體樣式。
- 保持桌面應用中表單、列表、視窗、modal、toolbar 的一致性。

## 程式風格
- 與既有程式碼一致，避免引入新的架構偏好。
- 保留檔案結構、命名習慣與既有工具函式。
- 若需抽出共用邏輯，先確認不會影響打包與引用路徑。

## 安全與穩定性
- 對檔案系統、下載、上傳、執行外部程序、剪貼簿、通知、更新流程特別保守。
- 不要放寬安全限制。
- 不要在未確認必要性的情況下開啟更多 Node 能力給 Renderer。
- 盡量避免破壞沙箱與最小權限原則。

## 除錯與驗證
- 若涉及桌面行為，需考慮：
  - Windows 啟動與關閉
  - 視窗尺寸與多視窗
  - IPC 通訊
  - preload 可用性
  - 打包後路徑
  - 更新流程
  - 本機檔案存取
- 若是 Renderer 畫面修改，也要確認 Electron 環境與瀏覽器環境差異。

## 輸出要求
當你提供修改建議或程式碼時，請：
- 明確區分 Main Process / Renderer / preload。
- 提供可直接貼用的片段。
- 指出可能影響打包、IPC 或權限的地方。
- 若有跨檔案影響，標示檔名與區塊。

## 禁止事項
- 不要預設可改用現代重架構。
- 不要隨意開啟 `nodeIntegration`。
- 不要破壞 preload 與安全隔離。
- 不要大改打包流程。
- 不要因為清理程式而改動穩定的桌面行為。

## 預設工作方式
- 先判斷是 Main、Renderer 還是 preload 的責任。
- 先保守修改，再逐步驗證。
- 先維持穩定，再考慮整理。