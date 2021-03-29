<template lang="pug">
  b-card.max-w640.m-1(v-cloak no-body header-tag="nav")
    template(#header): b-nav(card-header tabs)
      b-nav-item(:active="defActive" v-if="defActive") {{ username }}
      b-nav-item(:active="isAnnouncement") 公告
      b-nav-item(:active="isInf" v-if="belongToInf") 資訊課
      b-nav-item(:active="isAdm" v-if="belongToAdm") 行政課
      b-nav-item(:active="isVal" v-if="belongToVal") 地價課
      b-nav-item(:active="isReg" v-if="belongToReg") 登記課
      b-nav-item(:active="isSur" v-if="belongToSur") 測量課
      b-nav-item(:active="isAcc" v-if="belongToAcc") 會計室
      b-nav-item(:active="isHr" v-if="belongToHr") 人事室
      b-nav-item(:active="isSupervisor" v-if="belongToSupervisor") 主任祕書室
    Nuxt
</template>

<script>
import isEmpty from 'lodash/isEmpty'
export default {
  data: () => ({
    userid: process.env['USERNAME']
  }),
  computed: {
    username () { return this.$config ? this.$config.username : '' },
    userdept () { return this.$config ? this.$config.userdept : '' },
    defActive () { return isEmpty(this.pageId) },
    pageId () { return this.$route.params.id },
    isAnnouncement () { return this.pageId === 'announcement' },
    isInf () { return this.pageId === 'inf' },
    isAdm () { return this.pageId === 'adm' },
    isVal () { return this.pageId === 'val' },
    isReg () { return this.pageId === 'reg' },
    isSur () { return this.pageId === 'sur' },
    isAcc () { return this.pageId === 'acc' },
    isHr () { return this.pageId === 'hr' },
    isSupervisor () { return this.pageId === 'supervisoor' },
    
    belongToInf () { return this.userdept === 'inf' },
    belongToAdm () { return this.userdept === 'adm' },
    belongToVal () { return this.userdept === 'val' },
    belongToReg () { return this.userdept === 'reg' },
    belongToSur () { return this.userdept === 'sur' },
    belongToAcc () { return this.userdept === 'acc' },
    belongToHr () { return this.userdept === 'hr' },
    belongToSupervisor () { return this.userdept === 'supervisoor' }
  },
  mounted() { console.log(this.$route.params) }
}
</script>

<style lang="scss" scoped>
.max-w640 {
  max-width: 480px;
}
</style>
