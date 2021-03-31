<template lang="pug">
  b-card.max-w480.m-1(v-cloak no-body header-tag="nav")
    template(#header): client-only: b-nav(card-header tabs ends)
      b-nav-item(:active="isPersonal")
        a.mr-1(@click="setCurrentChannel(userid)") 個人通知
        b-badge(variant="success" pill v-if="showUnread(userid)") {{ getUnread(userid) }}
      b-nav-item(:active="isAnnouncement")
        a.mr-1(@click="setCurrentChannel('announcement')") 公告
        b-badge(variant="danger" pill v-if="showUnread('announcement')") {{ getUnread('announcement') }}
      b-nav-item(:active="isInf" v-if="belongToInf")
        a.mr-1(@click="setCurrentChannel('inf')") 資訊課
        b-badge(variant="primary" pill v-if="showUnread('inf')") {{ getUnread('inf') }}
      b-nav-item(:active="isAdm" v-if="belongToAdm")
        a.mr-1(@click="setCurrentChannel('adm')") 行政課
        b-badge(variant="primary" pill v-if="showUnread('adm')") {{ getUnread('adm') }}
      b-nav-item(:active="isVal" v-if="belongToVal")
        a.mr-1(@click="setCurrentChannel('val')") 地價課
        b-badge(variant="primary" pill v-if="showUnread('val')") {{ getUnread('val') }}
      b-nav-item(:active="isReg" v-if="belongToReg")
        a.mr-1(@click="setCurrentChannel('reg')") 登記課
        b-badge(variant="primary" pill v-if="showUnread('reg')") {{ getUnread('reg') }}
      b-nav-item(:active="isSur" v-if="belongToSur")
        a.mr-1(@click="setCurrentChannel('sur')") 測量課
        b-badge(variant="primary" pill v-if="showUnread('sur')") {{ getUnread('sur') }}
      b-nav-item(:active="isAcc" v-if="belongToAcc")
        a.mr-1(@click="setCurrentChannel('acc')") 會計室
        b-badge(variant="primary" pill v-if="showUnread('acc')") {{ getUnread('acc') }}
      b-nav-item(:active="isHr" v-if="belongToHr")
        a.mr-1(@click="setCurrentChannel('hr')") 人事室
        b-badge(variant="primary" pill v-if="showUnread('hr')") {{ getUnread('hr') }}
      b-nav-item(:active="isSupervisor" v-if="belongToSupervisor")
        a.mr-1(@click="setCurrentChannel('supervisor')") 主任祕書室
        b-badge(variant="primary" pill v-if="showUnread('supervisor')") {{ getUnread('supervisor') }}
      b-nav-item(:active="isLds")
        a.mr-1(@click="setCurrentChannel('lds')") 全所頻道
        b-badge(variant="secondary" pill v-if="showUnread('lds')") {{ getUnread('lds') }}
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
    isPersonal () { return this.userid === this.currentChannel },
    isAnnouncement () { return this.currentChannel === 'announcement' },
    isInf () { return this.currentChannel === 'inf' },
    isAdm () { return this.currentChannel === 'adm' },
    isVal () { return this.currentChannel === 'val' },
    isReg () { return this.currentChannel === 'reg' },
    isSur () { return this.currentChannel === 'sur' },
    isAcc () { return this.currentChannel === 'acc' },
    isHr () { return this.currentChannel === 'hr' },
    isSupervisor () { return this.currentChannel === 'supervisor' },
    isLds () { return this.currentChannel === 'lds' },
    
    belongToInf () { return this.userdept === 'inf' },
    belongToAdm () { return this.userdept === 'adm' },
    belongToVal () { return this.userdept === 'val' },
    belongToReg () { return this.userdept === 'reg' },
    belongToSur () { return this.userdept === 'sur' },
    belongToAcc () { return this.userdept === 'acc' },
    belongToHr () { return this.userdept === 'hr' },
    belongToSupervisor () { return this.userdept === 'supervisor' }
  },
  watch: {
    currentChannel(nVal, oVal) {
      this.$config.isDev && console.log(`離開 ${oVal} 頻道，進入 ${nVal} 頻道`)
      if (!(nVal in this.messages)) {
        this.$store.commit("addChannel", nVal || this.userid)
        this.$config.isDev && console.log(this.time(), `add channel ${nVal} to $store!`)
        this.$store.commit("resetUnread", nVal || this.userid)
        this.$config.isDev && console.log(this.time(), `add unread ${nVal} to $store!`)
      }
      // release from channel items
      this.messages[oVal].length = 0
      this.latestMessage()
    }
  },
  methods: {
    date() {
      const now = new Date()
      return (
        now.getFullYear() +
        "-" +
        ("0" + (now.getMonth() + 1)).slice(-2) +
        "-" +
        ("0" + now.getDate()).slice(-2)
      )
    },
    time() {
      const now = new Date()
      const time =
        ("0" + now.getHours()).slice(-2) +
        ":" +
        ("0" + now.getMinutes()).slice(-2) +
        ":" +
        ("0" + now.getSeconds()).slice(-2)
      return time
    },
    latestMessage() {
      if (this.websocket && this.websocket.readyState === 1) {
        const jsonString = JSON.stringify({
          type: "latest",
          sender: this.userid,
          date: this.date(),
          time: this.time(),
          message: this.currentChannel
        })
        this.websocket.send(jsonString)
      } else {
        this.$config.isDev && console.log(
          this.time(),
          `尚未連線無法取得 ${this.currentChannel} 最新訊息資料`
        )
      }
    },
    setCurrentChannel (channel) {
      this.$store.commit('currentChannel', channel)
      // switch to new channel reset the unread number
      this.$store.commit("resetUnread", channel)
    },
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
