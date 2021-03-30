<template lang="pug">
  b-card.max-w480.m-1(v-cloak no-body header-tag="nav")
    template(#header): client-only: b-nav(card-header tabs)
      b-nav-item(:active="isAnnouncement")
        nuxt-link.mr-1(to="/message/announcement") 公告
        b-badge(variant="danger" pill v-if="showUnread('announcement')") {{ getUnread('announcement') }}
      b-nav-item(:active="isInf" v-if="belongToInf")
        nuxt-link.mr-1(to="/message/inf") 資訊課
        b-badge(variant="primary" pill v-if="showUnread('inf')") {{ getUnread('inf') }}
      b-nav-item(:active="isAdm" v-if="belongToAdm")
        nuxt-link.mr-1(to="/message/adm") 行政課
        b-badge(variant="primary" pill v-if="showUnread('adm')") {{ getUnread('adm') }}
      b-nav-item(:active="isVal" v-if="belongToVal")
        nuxt-link.mr-1(to="/message/val") 地價課
        b-badge(variant="primary" pill v-if="showUnread('val')") {{ getUnread('val') }}
      b-nav-item(:active="isReg" v-if="belongToReg")
        nuxt-link.mr-1(to="/message/reg") 登記課
        b-badge(variant="primary" pill v-if="showUnread('reg')") {{ getUnread('reg') }}
      b-nav-item(:active="isSur" v-if="belongToSur")
        nuxt-link.mr-1(to="/message/sur") 測量課
        b-badge(variant="primary" pill v-if="showUnread('sur')") {{ getUnread('sur') }}
      b-nav-item(:active="isAcc" v-if="belongToAcc")
        nuxt-link.mr-1(to="/message/acc") 會計室
        b-badge(variant="primary" pill v-if="showUnread('acc')") {{ getUnread('acc') }}
      b-nav-item(:active="isHr" v-if="belongToHr")
        nuxt-link.mr-1(to="/message/hr") 人事室
        b-badge(variant="primary" pill v-if="showUnread('hr')") {{ getUnread('hr') }}
      b-nav-item(:active="isSupervisor" v-if="belongToSupervisor")
        nuxt-link.mr-1(to="/message/supervisor") 主任祕書室
        b-badge(variant="primary" pill v-if="showUnread('supervisor')") {{ getUnread('supervisor') }}
      b-nav-item(:active="isPersonal")
        nuxt-link.mr-1(to="/message") 個人通知
        b-badge(variant="success" pill v-if="showUnread(userid)") {{ getUnread(userid) }}
    Nuxt
</template>

<script>
import isEmpty from 'lodash/isEmpty'
export default {
  data: () => ({
    userid: process.env['USERNAME'],
    channel: process.env['USERNAME']
  }),
  computed: {
    username () { return this.$config ? this.$config.username : '' },
    userdept () { return this.$config ? this.$config.userdept : '' },
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
  },
  methods: {
    showUnread (channel) {
      return this.getUnread(channel) > 0
    },
    getUnread (channel) {
      if (this.unread) {
         return this.unread[channel] || 0
      }
      return 0
    }
  }
}
</script>

<style lang="scss" scoped>
.max-w480 {
  max-width: 480px;
}
</style>
