<template lang="pug">
div
  h5 - 「日期/時間區間」自動醒目顯示(藍色粗體)
  .ml-2 08:00~09:00 👉 #[b(style="color:blue") 08:00~09:00]
  .ml-2 6/30~7/1 👉 #[b(style="color:blue") 6/30~7/1]
  .ml-2 ⭐小括號內或是有空白間隔的時間/日期亦會以粗體藍字顯示
  h5.mt-3 - 支援以 ｛｛ ｝｝ 包圍語法搭配 b / r / g / o (粗藍、粗紅、粗綠、粗橘色) 自行加入醒目顯示
  .ml-2 ｛｛b我變成藍色粗體文字顯示b｝｝ 👉 #[b(style="color:blue") 我變成藍色粗體文字顯示]
  .ml-2 ｛｛r我變成紅色粗體文字顯示r｝｝ 👉 #[b(style="color:red") 我變成紅色粗體文字顯示]
  .ml-2 ｛｛g我變成綠色粗體文字顯示g｝｝ 👉 #[b(style="color:green") 我變成綠色粗體文字顯示]
  .ml-2 ｛｛o我變成橘色粗體文字顯示o｝｝ 👉 #[b(style="color:orange") 我變成橘色粗體文字顯示]
  h5.mt-3 - 支援文字以全形括號包圍自動粗體顯示
  .ml-2 「我用全形角括號包圍」 👉 #[b 「我用全形角括號包圍」]
  .ml-2 （我用全形小括號包圍） 👉 #[b （我用全形小括號包圍）]
  .ml-2 ⭐共支援 '「（【《『〈〔 這8種包圍文字自動粗體顯示
</template>

<script>
export default {
  data: () => ({})
}
</script>

<style lang="scss" scoped>
</style>