<template lang="pug">
  b-card.max-w640.m-1(v-cloak no-body header-tag="nav")
    template(#header): b-nav(card-header tabs)
      b-nav-item(:active="defActive" v-if="defActive") {{ userid }}
      b-nav-item(:active="isAnnouncement" v-if="isAnnouncement") 公告
      b-nav-item(:active="isInf" v-if="isInf") 資訊課
      b-nav-item(:active="isAdm" v-if="isAdm") 行政課
      b-nav-item(:active="isVal" v-if="isVal") 地價課
      b-nav-item(:active="isReg" v-if="isReg") 登記課
      b-nav-item(:active="isSur" v-if="isSur") 測量課
      b-nav-item(:active="isSupervisor" v-if="isSupervisor") 主任祕書室
    Nuxt
</template>

<script>
import isEmpty from 'lodash/isEmpty'
export default {
  data: () => ({
    userid: process.env['USERNAME']
  }),
  computed: {
    defActive () { return isEmpty(this.pageId) },
    pageId () { return this.$route.params.id },
    isAnnouncement () { return this.pageId === 'announcement' },
    isInf () { return this.pageId === 'inf' },
    isAdm () { return this.pageId === 'adm' },
    isVal () { return this.pageId === 'val' },
    isReg () { return this.pageId === 'reg' },
    isSur () { return this.pageId === 'sur' },
    isSupervisor () { return this.pageId === 'supervisoor' }
  },
  mounted() { console.log(this.$route.params) }
}
</script>

<style lang="scss" scoped>
.max-w640 {
  max-width: 480px;
}
</style>
