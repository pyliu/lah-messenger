<template lang="pug">
  b-card.max-w480.m-1(v-cloak no-body header-tag="nav")
    template(#header): client-only: b-nav(card-header tabs)
      b-nav-item(:active="isAnnouncement"): nuxt-link(to="/message/announcement") 公告
      b-nav-item(:active="isInf" v-if="belongToInf"): nuxt-link(to="/message/inf") 資訊課
      b-nav-item(:active="isAdm" v-if="belongToAdm"): nuxt-link(to="/message/adm") 行政課
      b-nav-item(:active="isVal" v-if="belongToVal"): nuxt-link(to="/message/val") 地價課
      b-nav-item(:active="isReg" v-if="belongToReg"): nuxt-link(to="/message/reg") 登記課
      b-nav-item(:active="isSur" v-if="belongToSur"): nuxt-link(to="/message/sur") 測量課
      b-nav-item(:active="isAcc" v-if="belongToAcc"): nuxt-link(to="/message/acc") 會計室
      b-nav-item(:active="isHr" v-if="belongToHr"): nuxt-link(to="/message/hr") 人事室
      b-nav-item(:active="isSupervisor" v-if="belongToSupervisor"): nuxt-link(to="/message/supervisor") 主任祕書室
      b-nav-item(:active="isPersonal"): nuxt-link(to="/message") 個人通知
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
    isPersonal () { return isEmpty(this.pageId) },
    isAnnouncement () { return this.pageId === 'announcement' },
    isInf () { return this.pageId === 'inf' },
    isAdm () { return this.pageId === 'adm' },
    isVal () { return this.pageId === 'val' },
    isReg () { return this.pageId === 'reg' },
    isSur () { return this.pageId === 'sur' },
    isAcc () { return this.pageId === 'acc' },
    isHr () { return this.pageId === 'hr' },
    isSupervisor () { return this.pageId === 'supervisor' },
    
    belongToInf () { return this.userdept === 'inf' },
    belongToAdm () { return this.userdept === 'adm' },
    belongToVal () { return this.userdept === 'val' },
    belongToReg () { return this.userdept === 'reg' },
    belongToSur () { return this.userdept === 'sur' },
    belongToAcc () { return this.userdept === 'acc' },
    belongToHr () { return this.userdept === 'hr' },
    belongToSupervisor () { return this.userdept === 'supervisor' }
  }
}
</script>

<style lang="scss" scoped>
.max-w480 {
  max-width: 480px;
}
</style>
