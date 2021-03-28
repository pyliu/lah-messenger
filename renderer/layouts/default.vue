<template lang="pug">
  b-card(v-cloak no-body header-tag="nav")
    template(#header): b-nav(card-header tabs)
      b-nav-item(:active="defActive") {{ userid }}
      b-nav-item LDS
      b-nav-item(disabled) 關閉
    Nuxt
</template>

<script>
import isEmpty from 'lodash/isEmpty'
export default {
  data: () => ({
    userid: process.env['USERNAME']
  }),
  computed: {
    defActive () { return isEmpty(this.$route.params.id) }
  },
  mounted() { console.log(this.$route.params) }
}
</script>

<style lang="scss" scoped>
</style>
