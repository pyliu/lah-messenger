<template lang="pug">
  .main-window(v-cloak)
    b-row(align-v="center" align-h="between")
      b-col aaa
      b-col bbb
    Nuxt
</template>

<script>
export default {
}
</script>

<style lang="scss" scoped>
.main-window {
  width: 640px;
  height: 100vh;
  border: 3px solid red;
}
</style>
