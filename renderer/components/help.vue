<template lang="pug">
b-list-group(flush)
  b-list-group-item
    h5.font-weight-bold 1. 字體大小調整(需於#[span.text-primary 行首]輸入)
    .d-flex.align-items-center.ml-2 # 我是最大文字 👉 #[h1.ml-1 我是最大文字]
    .d-flex.align-items-center.ml-2 ## 我是次大文字 👉 #[h2.ml-1 我是次大文字]
    .d-flex.align-items-center.ml-2 ⭐ 以此類推，最多為6個階層
  
  b-list-group-item
    h5.font-weight-bold 2. 支援以 ｛｛ ｝｝ 包圍語法搭配 b / r / g / o (粗藍、粗紅、粗綠、粗橘色) 自行加入醒目顯示
    .ml-2 ｛｛b藍色粗體顯示b｝｝ 👉 #[b(style="color:blue") 藍色粗體顯示]
    .ml-2 ｛｛r紅色粗體顯示r｝｝ 👉 #[b(style="color:red") 紅色粗體顯示]
    .ml-2 ｛｛g綠色粗體顯示g｝｝ 👉 #[b(style="color:green") 綠色粗體顯示]
    .ml-2 ｛｛o橘色粗體顯示o｝｝ 👉 #[b(style="color:orange") 橘色粗體顯示]
  
  b-list-group-item
    h5.font-weight-bold 3. 「日期/時間區間」自動醒目顯示
    .ml-2 08:00~09:00 👉 #[b(style="color:blue") 08:00~09:00]
    .ml-2 6/30~7/1 👉 #[b(style="color:blue") 6/30~7/1]
    .ml-2 ⭐#[span.text-primary 小括號內]或是有#[span.text-primary 空白間隔]的時間/日期亦會以粗體藍字顯示
  
  b-list-group-item
    h5.font-weight-bold 4. 支援文字以#[b.text-primary 全形括號]包圍自動粗體顯示
    .ml-2 「我用全形角括號包圍」 👉 #[b 「我用全形角括號包圍」]
    .ml-2 （我用全形小括號包圍） 👉 #[b （我用全形小括號包圍）]
    .ml-2 ⭐共支援 「（【《『〈〔 這8種包圍文字自動粗體顯示
  
  b-list-group-item
    h5.font-weight-bold 5. 其餘詳細語法請參閱下方連結
    .ml-2 #[a(:href="`${apiQueryUrl}/markdown.html`", target="_blank") https://markdown.tw/] 教學
</template>

<script>
export default {
  data: () => ({})
}
</script>

<style lang="scss" scoped>
</style>