<template lang="pug">
.lah-messenger-help(@click="handleSpecialClick($event)")
  b-tabs(pills card fill active-nav-item-class="font-weight-bold" content-class="mt-3")
    //- ======================= 分頁 1: 文字排版與醒目 =======================
    b-tab(active)
      template(#title)
        b-icon.mr-1(icon="fonts")
        span 文字排版與醒目

      //- 1. 自訂醒目色彩文字
      .tab-section.mb-3
        .d-flex.align-items-center.mb-2
          b-icon.mr-1(icon="palette-fill" variant="primary")
          h6.font-weight-bold.mb-0 自訂醒目色彩文字
        p.s-90.text-muted.mb-2
          span 使用大括號標籤包圍文字，即可自訂粗體醒目色彩（半形 
          code {{ }}
          span  或全形 
          code ｛｛ ｝｝
          span  皆支援）：
        .table-responsive
          table.table.table-sm.table-bordered.align-middle.s-90.mb-0
            thead.thead-light
              tr.text-center
                th(style="width: 20%") 色彩標籤
                th(style="width: 40%") 輸入語法
                th(style="width: 40%") 呈現效果
            tbody
              tr
                td.text-center: b-badge(variant="primary") 藍色文字 (b)
                td: code {{b 藍色重點文字 b}}
                td: span.text-bold-blue 藍色重點文字
              tr
                td.text-center: b-badge(variant="danger") 紅色文字 (r)
                td: code {{r 紅色緊急提醒 r}}
                td: span.text-bold-red 紅色緊急提醒
              tr
                td.text-center: b-badge(variant="success") 綠色文字 (g)
                td: code {{g 綠色正常進度 g}}
                td: span.text-bold-green 綠色正常進度
              tr
                td.text-center: b-badge(variant="warning") 橘色文字 (o)
                td: code {{o 橘色警示事項 o}}
                td: span.text-bold-orange 橘色警示事項

      //- 2. 系統智慧辨識自動醒目
      .tab-section.mb-3
        .d-flex.align-items-center.mb-2
          b-icon.mr-1(icon="magic" variant="primary")
          h6.font-weight-bold.mb-0 系統自動辨識加粗與變色
        .table-responsive
          table.table.table-sm.table-bordered.align-middle.s-90.mb-0
            thead.thead-light
              tr.text-center
                th(style="width: 25%") 辨識類型
                th(style="width: 35%") 輸入範例
                th(style="width: 40%") 呈現效果與說明
            tbody
              tr
                td.font-weight-bold.text-center 日期與時間區間
                td
                  code 08:00~17:00
                  br
                  code 6/30~7/1
                  br
                  code 10點至12點
                td
                  span.text-bold-blue 08:00~17:00
                  br
                  span.text-bold-blue 6/30~7/1
                  br
                  span.text-bold-blue 10點至12點
                  .s-80.text-muted.mt-1 自動轉換為藍色粗體醒目顯示
              tr
                td.font-weight-bold.text-center 全形括號文字
                td
                  code 「重要決策」
                  br
                  code （註記說明）
                  br
                  code 【緊急公文】
                td
                  b 「重要決策」
                  br
                  b （註記說明）
                  br
                  b 【緊急公文】
                  .s-80.text-muted.mt-1 支援 「（【《『〈〔 等符號自動加粗
              tr
                td.font-weight-bold.text-center 本機與網路路徑
                td
                  code \\220.1.34.57\分享區
                  br
                  code C:\Users\Document
                td
                  span.open-os-explorer(title="點擊測試複製路徑") \\220.1.34.57\分享區
                  br
                  span.open-os-explorer(title="點擊測試複製路徑") C:\Users\Document
                  .s-80.text-success.mt-1
                    b-icon.mr-1(icon="cursor-fill")
                    strong 點擊上方文字即可自動複製至剪貼簿！
              tr
                td.font-weight-bold.text-center 含空白之路徑
                td: code "\\192.168.1.1\Public Folder"
                td
                  span.open-os-explorer(title="點擊測試複製路徑") "\\192.168.1.1\Public Folder"
                  .s-80.text-muted.mt-1 包含空格的路徑請以雙引號包覆

      //- 3. 常用 Markdown 排版
      .tab-section
        .d-flex.align-items-center.mb-2
          b-icon.mr-1(icon="markdown" variant="primary")
          h6.font-weight-bold.mb-0 常用 Markdown 排版語法
        .table-responsive
          table.table.table-sm.table-bordered.align-middle.s-90.mb-0
            thead.thead-light
              tr.text-center
                th(style="width: 25%") 排版樣式
                th(style="width: 45%") 輸入語法
                th(style="width: 30%") 呈現效果
            tbody
              tr
                td.font-weight-bold.text-center 階層標題
                td: code # 大標題 #[br] ## 次標題
                td
                  strong.d-block.h6.mb-0 大標題
                  span.d-block.s-90.font-weight-bold 次標題
              tr
                td.font-weight-bold.text-center 粗體與斜體
                td: code **粗體文字** 與 *斜體文字*
                td
                  strong 粗體文字
                  span  與 
                  em 斜體文字
              tr
                td.font-weight-bold.text-center 刪除線
                td: code ~~已廢棄或修正文字~~
                td: del 已廢棄或修正文字
              tr
                td.font-weight-bold.text-center 引用文字
                td: code > 這是重要引言內容
                td.text-muted.border-left.pl-2: em 這是重要引言內容
              tr
                td.font-weight-bold.text-center 條列清單
                td: code - 項目一 #[br] - 項目二
                td
                  ul.pl-3.mb-0
                    li 項目一
                    li 項目二

    //- ======================= 分頁 2: 訊息操作與快捷鍵 =======================
    b-tab
      template(#title)
        b-icon.mr-1(icon="keyboard")
        span 訊息操作與快捷鍵

      //- 1. 快捷鍵
      .tab-section.mb-3
        .d-flex.align-items-center.mb-2
          b-icon.mr-1(icon="lightning-fill" variant="primary")
          h6.font-weight-bold.mb-0 鍵盤操作與快速鍵
        .row.s-90
          .col-md-6.mb-2
            .p-2.border.rounded.bg-light.d-flex.align-items-center.justify-content-between.h-100
              div
                .font-weight-bold.text-dark 立即送出訊息
                .s-80.text-muted 於文字輸入框直接按下送出
              div
                kbd Enter
          .col-md-6.mb-2
            .p-2.border.rounded.bg-light.d-flex.align-items-center.justify-content-between.h-100
              div
                .font-weight-bold.text-dark 換行輸入 (多行文字)
                .s-80.text-muted 同時按住輔助鍵與 Enter 換行
              .text-nowrap
                kbd Shift
                span.mx-1 +
                kbd Enter

      //- 2. 圖片與貼圖
      .tab-section.mb-3
        .d-flex.align-items-center.mb-2
          b-icon.mr-1(icon="images" variant="primary")
          h6.font-weight-bold.mb-0 圖片傳送與貼圖支援
        ul.s-90.pl-3.mb-0
          li.mb-2
            strong.text-dark 剪貼簿快速貼圖：
            span 使用截圖工具（如 
            kbd Win + Shift + S
            span ）複製畫面後，直接在輸入框按下 
            kbd Ctrl + V
            span  即可自動載入圖片預覽，確認後送出。
          li.mb-2
            strong.text-dark 檔案挑選上傳：
            span 點選輸入框下方的 
            b-icon(icon="image" variant="secondary")
            span  圖片按鈕，可自本機挑選 PNG / JPG 圖檔上傳。
          li.mb-1
            strong.text-dark 表情符號：
            span 點選輸入框下方的 
            b-icon(icon="emoji-smile" variant="warning")
            span  笑臉按鈕，可直接選取常用的 Emoji 表情貼圖。

      //- 3. 訊息管理
      .tab-section
        .d-flex.align-items-center.mb-2
          b-icon.mr-1(icon="tools" variant="primary")
          h6.font-weight-bold.mb-0 訊息管理與互動狀態
        .row.s-90
          .col-md-6.mb-2
            .p-2.border.rounded.h-100
              .d-flex.align-items-center.mb-1
                b-icon.mr-1(icon="pencil-fill" variant="primary")
                strong.text-dark 訊息編輯 (24小時內)
              .text-muted 發送 24 小時內之個人訊息，點擊右側鉛筆按鈕即可重新編輯對話文字。
          .col-md-6.mb-2
            .p-2.border.rounded.h-100
              .d-flex.align-items-center.mb-1
                b-icon.mr-1(icon="x-circle" variant="danger")
                strong.text-dark 訊息收回 (24小時內)
              .text-muted 點擊紅色按鈕可將發送未滿 24 小時的訊息收回並自聊天室中撤除。
          .col-md-6.mb-2
            .p-2.border.rounded.h-100
              .d-flex.align-items-center.mb-1
                b-icon.mr-1(icon="reply-fill" variant="secondary")
                strong.text-dark 引用回覆
              .text-muted 點擊他人訊息旁的回覆箭頭，系統會自動將該則訊息作為引用帶入輸入框。
          .col-md-6.mb-2
            .p-2.border.rounded.h-100
              .d-flex.align-items-center.mb-1
                b-icon.mr-1(icon="check-all" variant="primary")
                strong.text-dark 雙勾勾已讀確認
              .text-muted 發送之私訊於對方開啟閱讀後，時間旁將自動顯示 
                b-icon(icon="check-all" variant="secondary")
                span  已讀標記。

    //- ======================= 分頁 3: 頻道與功能導覽 =======================
    b-tab
      template(#title)
        b-icon.mr-1(icon="chat-dots")
        span 頻道與功能導覽

      //- 1. 頻道分類
      .tab-section.mb-3
        .d-flex.align-items-center.mb-2
          b-icon.mr-1(icon="collection-fill" variant="primary")
          h6.font-weight-bold.mb-0 頻道分類架構
        .row.s-90
          .col-md-6.mb-2
            .p-2.border.rounded.h-100.bg-light
              .d-flex.align-items-center.mb-1
                b-badge.mr-1(variant="danger") 📣 公告
                strong 全所公佈欄
              .text-muted 具備卡片式醒目瀏覽，支援設定公告標題、優先層級（一般/重要/緊急）與有效截止時間。
          .col-md-6.mb-2
            .p-2.border.rounded.h-100.bg-light
              .d-flex.align-items-center.mb-1
                b-badge.mr-1(variant="primary") 💬 LDS
                strong 全所交誼聊天室
              .text-muted 全所同仁公開交誼與即時討論空間，可發布各類共同事項或休閒交流。
          .col-md-6.mb-2
            .p-2.border.rounded.h-100.bg-light
              .d-flex.align-items-center.mb-1
                b-badge.mr-1(variant="info") 🏢 課室頻道
                strong 各課室專屬聊天室
              .text-muted 登記、測量、地價、資訊、行政、會計、人事等各課內部專屬業務研討頻道。
          .col-md-6.mb-2
            .p-2.border.rounded.h-100.bg-light
              .d-flex.align-items-center.mb-1
                b-badge.mr-1(variant="success") 🔒 私訊
                strong 個人一對一對話
              .text-muted 點擊在線同仁名單或大頭貼即可開啟一對一私密對話。

      //- 2. 同仁卡片與連線診斷
      .tab-section
        .d-flex.align-items-center.mb-2
          b-icon.mr-1(icon="person-badge-fill" variant="primary")
          h6.font-weight-bold.mb-0 同仁資訊卡片與連線設定
        ul.s-90.pl-3.mb-0
          li.mb-2
            strong 查詢同仁分機與資訊：
            span 點選對話中的任何大頭貼，或從右側「在線同仁」列表點選同仁姓名，即可跳出同仁資訊卡片（含姓名、分機、所屬課室），並提供快速開啟私訊按鈕。
          li.mb-1
            strong 自訂 WebSocket 伺服器：
            span 若遇即時通伺服器連線中斷或維護，可點擊上方提示橫條的「自訂」按鈕，快速切換或自訂 WebSocket IP 與 Port 連線。

  //- 底部外部連結與提示
  .mt-3.pt-2.border-top.d-flex.flex-wrap.justify-content-between.align-items-center.text-muted.s-85
    span.mr-2 💡 提示：輸入文字支援完整 Markdown 格式，系統會自動防護過濾惡意 HTML 標籤。
    b-link.text-primary.font-weight-bold(href="https://markdown.tw/" target="_blank" rel="noopener noreferrer")
      b-icon.mr-1(icon="box-arrow-up-right")
      span Markdown 完整語法手冊 (另開分頁)
</template>

<script>
export default {
  name: 'Help',
  data: () => ({}),
  methods: {
    handleSpecialClick (event) {
      this.$utils?.handleSpecialClick(event)
    }
  }
}
</script>

<style lang="scss" scoped>
.lah-messenger-help {
  max-width: 100%;
}

.tab-section {
  padding-bottom: 0.5rem;

  h6 {
    letter-spacing: 0.5px;
  }
}

code {
  background-color: #f8f9fa;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  color: #d63384;
  font-weight: bold;
  border: 1px solid #e9ecef;
  font-size: 0.85rem;
}

kbd {
  background-color: #343a40;
  color: #fff;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.25);
  font-size: 0.82rem;
  font-family: inherit;
}

.open-os-explorer {
  cursor: pointer;
  background-color: #e8f4fd;
  color: #007bff;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  border: 1px dashed #b8daff;
  display: inline-block;
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: #cce5ff;
    color: #0056b3;
    text-decoration: underline;
  }
}

.table {
  th {
    background-color: #f1f3f5;
    font-weight: 600;
  }
  td, th {
    vertical-align: middle;
  }
}
</style>