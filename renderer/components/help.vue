<template lang="pug">
.lah-messenger-help(@click="handleSpecialClick($event)")
  b-tabs(
    pills
    fill
    small
    nav-wrapper-class="help-tabs-nav bg-light rounded p-1 mb-2"
    active-nav-item-class="font-weight-bold shadow-sm"
    content-class="help-tabs-content"
  )
    //- ======================= 分頁 1: 排版語法 =======================
    b-tab(active)
      template(#title)
        b-icon.mr-1(icon="fonts")
        span 排版語法

      //- 1. 自訂醒目色彩
      .help-section.mb-3
        .section-heading
          b-icon.mr-1(icon="palette-fill" variant="primary")
          span 自訂醒目色彩
        p.section-desc
          span 使用半形 
          code(v-pre) {{ }}
          span  或全形 
          code ｛｛ ｝｝
          span  包圍文字即可套用粗體色彩。
        .help-card-list
          .help-card
            .d-flex.justify-content-between.align-items-center.mb-1
              b-badge(variant="primary") 藍色重點 (b)
              span.text-bold-blue.demo-text 藍色重點文字
            code.code-block(v-pre) {{b 藍色重點文字 b}}
          .help-card
            .d-flex.justify-content-between.align-items-center.mb-1
              b-badge(variant="danger") 紅色緊急 (r)
              span.text-bold-red.demo-text 紅色緊急提醒
            code.code-block(v-pre) {{r 紅色緊急提醒 r}}
          .help-card
            .d-flex.justify-content-between.align-items-center.mb-1
              b-badge(variant="success") 綠色進度 (g)
              span.text-bold-green.demo-text 綠色正常進度
            code.code-block(v-pre) {{g 綠色正常進度 g}}
          .help-card
            .d-flex.justify-content-between.align-items-center.mb-1
              b-badge(variant="warning") 橘色警示 (o)
              span.text-bold-orange.demo-text 橘色警示事項
            code.code-block(v-pre) {{o 橘色警示事項 o}}

      //- 2. 系統自動辨識
      .help-section.mb-3
        .section-heading
          b-icon.mr-1(icon="magic" variant="primary")
          span 系統自動辨識與路徑複製
        .help-card-list
          .help-card
            .card-title-row
              strong 日期與時間區間
              span.card-note 自動藍字加粗
            .d-flex.flex-wrap.align-items-center.mt-1
              code.mr-1.mb-1 08:00~17:00
              code.mr-1.mb-1 6/30~7/1
              span.mx-1 ➔
              span.text-bold-blue.mr-2 08:00~17:00
              span.text-bold-blue 6/30~7/1
          .help-card
            .card-title-row
              strong 全形括號自動加粗
              span.card-note 支援 「（【《『〈〔
            .mt-1
              b 「重要決策」
              span.mx-1 ・
              b （註記說明）
              span.mx-1 ・
              b 【緊急公文】
          .help-card
            .card-title-row
              strong 本機與網路路徑
              span.card-note.text-success.font-weight-bold 點擊即可複製
            .mt-1.path-demo-wrap
              span.open-os-explorer.mb-1(title="點擊測試複製路徑") \\220.1.34.57\分享區
              span.open-os-explorer.mb-1(title="點擊測試複製路徑") C:\Users\Document
              .card-note.mt-1 含空白路徑請加雙引號，例如：
              span.open-os-explorer.mt-1(title="點擊測試複製路徑") "\\192.168.1.1\Public Folder"

      //- 3. 常用 Markdown
      .help-section
        .section-heading
          b-icon.mr-1(icon="markdown" variant="primary")
          span 常用 Markdown 語法
        .help-card-list
          .help-card
            .d-flex.justify-content-between.align-items-center
              code # 標題 / ## 次標
              strong 階層標題
          .help-card
            .d-flex.justify-content-between.align-items-center
              code **粗體** *斜體*
              span #[strong 粗體] 與 #[em 斜體]
          .help-card
            .d-flex.justify-content-between.align-items-center
              code ~~修正文字~~
              del 刪除線文字
          .help-card
            .d-flex.justify-content-between.align-items-center
              code > 引言內容
              span.text-dark.border-left.pl-2: em 引言文字
          .help-card
            .d-flex.justify-content-between.align-items-center
              code - 項目一
              span 項目條列清單

    //- ======================= 分頁 2: 快捷操作 =======================
    b-tab
      template(#title)
        b-icon.mr-1(icon="keyboard")
        span 快捷操作

      //- 1. 鍵盤操作
      .help-section.mb-3
        .section-heading
          b-icon.mr-1(icon="lightning-fill" variant="primary")
          span 聊天室輸入快速鍵
        .help-card-list
          .help-card.d-flex.justify-content-between.align-items-center
            div
              strong.d-block 傳送訊息
              span.card-note 搭配輔助鍵送出對話
            .text-nowrap.ml-2
              kbd Ctrl
              span.mx-1 /
              kbd Shift
              span.mx-1 +
              kbd Enter
          .help-card.d-flex.justify-content-between.align-items-center
            div
              strong.d-block 換行輸入
              span.card-note 多行分段編輯
            kbd Enter
          .help-card.d-flex.justify-content-between.align-items-center
            div
              strong.d-block 清空輸入框
              span.card-note 快速清除目前草稿
            kbd Esc

      //- 2. 圖片、附件與表情
      .help-section.mb-3
        .section-heading
          b-icon.mr-1(icon="paperclip" variant="primary")
          span 圖片、附件與貼圖
        .help-card-list
          .help-card
            .card-title-row
              strong 剪貼簿快速貼圖
              .text-nowrap
                kbd Win+Shift+S
                span.mx-1 ➔
                kbd Ctrl+V
            .card-note.mt-1 截圖後於輸入框直接貼上即可載入預覽送出。
          .help-card
            .d-flex.align-items-center
              b-icon.mr-2(icon="image" variant="success")
              div
                strong.d-block 圖片與附加檔案
                span.card-note 點選輸入列圖示上傳 PNG/JPG 圖檔或各類業務附件。
          .help-card
            .d-flex.align-items-center
              b-icon.mr-2(icon="emoji-smile" variant="warning")
              div
                strong.d-block 表情符號挑選器
                span.card-note 點擊笑臉圖示快速插入常用 Emoji。

      //- 3. 訊息與公告管理
      .help-section
        .section-heading
          b-icon.mr-1(icon="tools" variant="primary")
          span 訊息與公告管理
        .help-card-list
          .help-card
            .d-flex.align-items-center.mb-1
              b-icon.mr-2(icon="arrow-down-circle-fill" variant="success")
              strong 公告推前（v1.6.3）
            .card-note 發布人或管理者可一鍵將重點公告移至畫面最前並保留原發布時間；已位於最前時按鈕停用。
          .help-card
            .d-flex.align-items-center.mb-1
              b-icon.mr-2(icon="megaphone-fill" variant="primary")
              strong 快速發布公告與私訊（v1.6.3）
            .card-note 切換至公告（具權限）或私訊頁籤時，可直接點擊右下角版本號旁的快速按鈕發布。
          .help-card
            .d-flex.align-items-center.mb-1
              b-icon.mr-2(icon="pencil-fill" variant="primary")
              strong 編輯與收回（24 小時內）
            .card-note 個人訊息於 24 小時內可點擊鉛筆編輯或紅色圖示收回；點他人訊息箭頭可引用回覆。
          .help-card
            .d-flex.align-items-center.mb-1
              b-icon.mr-2(icon="check-all" variant="primary")
              strong 雙勾勾已讀確認
            .card-note 對方開啟閱讀私訊後，時間旁將自動顯示雙勾勾標記。

    //- ======================= 分頁 3: 頻道功能 =======================
    b-tab
      template(#title)
        b-icon.mr-1(icon="chat-dots")
        span 頻道功能

      //- 1. 頻道分類
      .help-section.mb-3
        .section-heading
          b-icon.mr-1(icon="collection-fill" variant="primary")
          span 頻道分類導覽
        .help-card-list
          .help-card
            .d-flex.align-items-center.mb-1
              b-badge.mr-2(variant="danger")
                b-icon.mr-1(icon="megaphone-fill")
                span 公告
              strong 全所公佈欄
            .card-note 卡片式醒目瀏覽，支援設定標題、優先層級、有效時間、附件與推前強調。
          .help-card
            .d-flex.align-items-center.mb-1
              b-badge.mr-2(variant="primary")
                b-icon.mr-1(icon="chat-dots-fill")
                span 通知
              strong 全所與課室頻道
            .card-note 包含全所公開交誼頻道及登記、測量、地價、資訊、行政、會計、人事等課室專屬頻道。
          .help-card
            .d-flex.align-items-center.mb-1
              b-badge.mr-2(variant="success")
                b-icon.mr-1(icon="envelope-fill")
                span 私訊
              strong 個人一對一對話
            .card-note 點擊在線同仁大頭貼或右下角「發送私訊」按鈕，即可快速發起一對一對話。

      //- 2. 同仁資訊與連線
      .help-section
        .section-heading
          b-icon.mr-1(icon="person-badge-fill" variant="primary")
          span 同仁資訊與連線設定
        .help-card-list
          .help-card
            strong.d-block.mb-1 查詢同仁分機與個人卡片
            .card-note 點擊訊息大頭貼或「在線同仁」名單，可檢視姓名、分機、課室並直接私訊。
          .help-card
            strong.d-block.mb-1 歷史狀態與伺服器切換
            .card-note 點擊視窗左下角狀態列可查閱近期系統紀錄；斷線時可於登入或設定畫面調整主機連線。

  //- 底部外部手冊連結
  .help-footer.mt-2.pt-2.border-top.d-flex.justify-content-between.align-items-center
    span.card-note 支援 Markdown 與安全 HTML 過濾
    b-link.text-primary.font-weight-bold.text-nowrap(
      href="https://markdown.tw/"
      target="_blank"
      rel="noopener noreferrer"
    )
      b-icon.mr-1(icon="box-arrow-up-right")
      span 語法手冊
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
  font-size: 0.84rem;
  line-height: 1.45;
  color: #212529;
  overflow-x: hidden;
}

::v-deep .help-tabs-nav {
  border: 1px solid #dee2e6;
  .nav-link {
    padding: 0.35rem 0.45rem;
    font-size: 0.82rem;
    white-space: nowrap;
    color: #495057;
    display: flex;
    align-items: center;
    justify-content: center;
    &.active {
      color: #fff;
    }
  }
}

.help-section {
  .section-heading {
    display: flex;
    align-items: center;
    font-weight: 700;
    font-size: 0.9rem;
    color: #1f2937;
    margin-bottom: 0.4rem;
  }
  .section-desc {
    font-size: 0.8rem;
    color: #495057;
    margin-bottom: 0.5rem;
  }
}

.help-card-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.help-card {
  background-color: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 0.5rem 0.65rem;
  .card-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .card-note {
    font-size: 0.78rem;
    color: #495057;
  }
  .demo-text {
    font-size: 0.85rem;
  }
}

code {
  background-color: #f8f9fa;
  padding: 0.12rem 0.35rem;
  border-radius: 4px;
  color: #b02a37;
  font-weight: 600;
  border: 1px solid #e9ecef;
  font-size: 0.78rem;
  word-break: break-all;
}

.code-block {
  display: block;
  width: 100%;
}

kbd {
  background-color: #212529;
  color: #ffffff;
  padding: 0.12rem 0.38rem;
  border-radius: 4px;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.25);
  font-size: 0.75rem;
  font-family: inherit;
}

.path-demo-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.open-os-explorer {
  cursor: pointer;
  background-color: #e8f4fd;
  color: #0056b3;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  border: 1px dashed #90c8f8;
  display: inline-block;
  max-width: 100%;
  word-break: break-all;
  font-size: 0.78rem;
  transition: background-color 0.15s ease, color 0.15s ease;

  &:hover {
    background-color: #cce5ff;
    color: #003d80;
    text-decoration: underline;
  }
}

.help-footer {
  font-size: 0.78rem;
  .card-note {
    color: #495057;
  }
}
</style>
