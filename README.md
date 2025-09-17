<div class="text-center"><img src="snap.jpg" class="img-thumbnail"></div>

## Dev Usage

```bash
# copy the source
$ git clone git@github.com:pyliu/lah-messenger.git

# install dependencies
$ cd lah-messenger
$ yarn (or `npm install`)

# development mode
$ yarn dev (or `npm run dev`)

# production build
$ yarn build:win (or `npm run build`)
```
```mermaid
journey
    title Dev Roadmap
    section 2021-04
      發想: 3
    section 2021-05
      學習 websocket: 4
      架設 Node.js ws 伺服器測試: 5
    section 2021-06
      初始版本測試: 6
    section 2021-07 ~ 2021-12
      桃園所上線測試: 7
    section 2022~
      正式上線及後續改進: 8
 ```

 # 專案：lah-messenger 程式碼分析報告

## 1. 整體評價

此專案是一個功能完整的桌面即時通訊應用。採用了成熟的技術棧（Electron + Nuxt.js），並且將主程序 (main) 與渲染程序 (renderer) 的程式碼徹底分離。這樣的架構為長期維護和擴展奠定了穩固的基礎。

---

## 2. 技術棧 (Technology Stack)

- 核心框架：Electron（桌面應用外殼）、Nuxt.js（Vue.js 應用程式框架）
- UI 層：BootstrapVue（提供穩定的 UI 元件庫）
- 狀態管理：Vuex（透過 Nuxt 的 store）
- HTTP 客戶端：Axios（用於 API 請求）
- 工具庫：Lodash（提供實用的 JavaScript 工具函式）
- 打包工具：electron-builder（用於應用程式打包與發佈）

---

## 3. 專案結構優點

- 主程序／渲染程序分離  
  main 和 renderer 目錄劃分清晰，符合 Electron 開發最佳實踐。
- Nuxt.js 框架  
  自動處理路由、狀態管理與目錄結構，讓開發者專注於業務邏輯。
- 元件化開發  
  renderer/components 下包含大量可重用 Vue 元件（如 user-avatar.vue、message-board.vue），提升 UI 一致性和開發效率。
- 狀態管理集中化  
  renderer/store/index.js 使用 Vuex 管理使用者資訊、頻道與訊息，適合複雜應用需求。

---

## 4. 重構與優化建議

### A. 主程序 (main/background.js)

- 觀察  
  當前版本將視窗、系統匣、IPC 等邏輯集中於單一檔案，易造成維護困難。  
- 建議  
  使用已重構的 background.refactored.js 版本，將 IPC 事件處理器、輔助函式與錯誤處理拆分整理，統一異步操作邏輯。

### B. 渲染程序 (renderer/)

1. Vuex 狀態管理模組化  
   - 觀察  
     所有 Vuex 邏輯集中於 renderer/store/index.js，未來功能增多時檔案會迅速膨脹。  
   - 建議  
     拆分成多個模組檔案，如 renderer/store/user.js、renderer/store/channels.js、renderer/store/messages.js，各自管理狀態與 mutations。

2. API 請求邏輯的抽象化  
   - 觀察  
     API 呼叫散佈於 Vue 元件與 global-vue-mixin.js，元件與請求細節耦合。  
   - 建議  
     在 renderer/services/ 或 renderer/api/ 下建立服務層檔案，例如 api.js 或 userService.js：
     ```js
     import axios from 'axios';

     const apiClient = axios.create({ baseURL: process.env.API_URL });

     export default {
       getUserInfo(userId) {
         return apiClient.post('/user/info', { id: userId });
       },
       getOnlineUsers() {
         return apiClient.get('/users/online');
       }
       // ... 其他 API 請求
     }
     ```
     這樣所有端點管理集中，未來更換 HTTP 客戶端只需修改服務層。

3. 全域 Mixin (global-vue-mixin.js) 的使用  
   - 觀察  
     Mixin 隱性依賴元件，方法命名衝突風險高。  
   - 建議  
     將純工具函式移至 renderer/utils/ 目錄並以 import 使用；須存取 Vue 實例或 Store 的方法改為 Nuxt Plugins，並注入至 this（例如 this.$myUtils.formatDate()）。

### C. 設定管理

- 觀察  
  程式中存在硬編碼的設定值（API 路徑、WebSocket 位址等）。  
- 建議  
  利用 Nuxt 的環境變數機制，將所有設定移至 .env，並透過 nuxt.config.js 的 env 或 publicRuntimeConfig 暴露，實現開發、測試與生產環境的靈活切換。

---

## 5. 總結

此專案結構良好且功能穩定，能夠滿足目前業務需求。建議在長期維護階段採納 Vuex 模組化與 API 服務層抽象化等優化措施，以提升程式碼健康度與可維護性。
