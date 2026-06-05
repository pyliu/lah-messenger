<template lang="pug">
b-list-group(flush)
  b-list-group-item
    h5.font-weight-bold 1. 字體大小調整 (需於#[span.text-primary 行首]輸入)
    .d-flex.align-items-center.ml-2 # 我是最大文字 👉 #[h1.ml-1 我是最大文字]
    .d-flex.align-items-center.ml-2 ## 我是次大文字 👉 #[h2.ml-1 我是次大文字]
    .d-flex.align-items-center.ml-2 ⭐ 以此類推，最多支援至 6 個階層
  
  b-list-group-item
    h5.font-weight-bold 2. 自訂醒目顏色 (使用 ｛｛ ｝｝ 搭配 b / r / g / o 標籤)
    .ml-2 ｛｛b藍色粗體顯示b｝｝ 👉 #[b(style="color:blue") 藍色粗體顯示]
    .ml-2 ｛｛r紅色粗體顯示r｝｝ 👉 #[b(style="color:red") 紅色粗體顯示]
    .ml-2 ｛｛g綠色粗體顯示g｝｝ 👉 #[b(style="color:green") 綠色粗體顯示]
    .ml-2 ｛｛o橘色粗體顯示o｝｝ 👉 #[b(style="color:orange") 橘色粗體顯示]
  
  b-list-group-item
    h5.font-weight-bold 3. 「日期/時間區間」自動醒目顯示
    .ml-2 08:00~09:00 👉 #[b.text-primary 08:00~09:00]
    .ml-2 6/30~7/1 👉 #[b.text-primary 6/30~7/1]
    .ml-2 ⭐ #[span.text-primary 小括號內] 或有 #[span.text-primary 空白間隔] 的時間與日期，系統亦會自動轉換為藍色粗體。
  
  b-list-group-item
    h5.font-weight-bold 4. 全形括號文字自動粗體顯示
    .ml-2 「我用全形角括號包圍」 👉 #[b 「我用全形角括號包圍」]
    .ml-2 （我用全形小括號包圍） 👉 #[b （我用全形小括號包圍）]
    .ml-2 ⭐ 系統支援 「（【《『〈〔 等全形符號，包圍的文字將自動加粗。

  b-list-group-item
    h5.font-weight-bold.text-success 5. 網路/本機檔案路徑自動轉換與開啟
    .ml-2 直接輸入路徑 👉 #[code \\220.1.34.57\分享區\@TBD] 或 #[code C:\Users\Document]
    .ml-2 帶空白的路徑 👉 請使用引號包圍，如 #[code "\\192.168.1.1\Public Folder"]
    .ml-2.mt-1 ⭐ 系統會自動加上底色保護路徑（避免反斜線消失），且 #[strong.text-danger 直接點擊該路徑區塊，即可在系統中開啟該資料夾或檔案！]
  
  b-list-group-item
    h5.font-weight-bold 6. 其餘詳細 Markdown 語法請參閱下方連結
    .ml-2 👉 #[a(:href="`${apiQueryUrl}/markdown.html`", target="_blank") https://markdown.tw/ 教學手冊]
</template>

<script>
export default {
  data: () => ({})
}
</script>

<style lang="scss" scoped>
.list-group-item {
  padding: 1.25rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  
  h5 {
    margin-bottom: 0.75rem;
  }
}

// 增強 code 標籤的展示體驗，讓使用者明白這是可點擊的元素
code {
  background-color: #f8f9fa;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  color: #d63384;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border: 1px solid #e9ecef;
  
  &:hover {
    background-color: #e9ecef;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
}
</style>