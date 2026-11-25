# lah-messenger 記憶索引

## Features
- [2026-11-25] **公告推前、狀態列快速發布與窄版面說明（v1.6.3）**：卡片 Footer 加入「推前」按鈕、發布按鈕整合至右下角版本號旁，並以單欄卡片重構說明彈窗 → [`status.vue`](../renderer/components/status.vue)

## Bug Fixes
- [2026-11-25] **Vue 2 跨 `<transition>` 使用 `v-else-if` 靜默丟棄**：Nuxt 編譯仍回傳 0 但 DOM 被丟棄，已補建 `npm run check:vue` 樣板檢查防線 → [`check-vue.js`](../scripts/check-vue.js)
