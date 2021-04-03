<template lang="pug">
  .chat-container
    b-list-group(v-if="isChat" flush)
      b-list-group-item(v-if="belongToInf"): b-link.d-flex.justify-content-between.align-items-center(@click="setCurrentChannel('inf')")
        span 資訊課
        b-badge(variant="primary" pill v-if="showUnread('inf')") {{ getUnread('inf') }}
      b-list-group-item(v-if="belongToAdm"): b-link.d-flex.justify-content-between.align-items-center(@click="setCurrentChannel('adm')")
        span 行政課
        b-badge(variant="primary" pill v-if="showUnread('adm')") {{ getUnread('adm') }}
      b-list-group-item(v-if="belongToVal"): b-link.d-flex.justify-content-between.align-items-center(@click="setCurrentChannel('val')")
        span 地價課
        b-badge(variant="primary" pill v-if="showUnread('val')") {{ getUnread('val') }}
      b-list-group-item(v-if="belongToReg"): b-link.d-flex.justify-content-between.align-items-center(@click="setCurrentChannel('reg')")
        span 登記課
        b-badge(variant="primary" pill v-if="showUnread('reg')") {{ getUnread('reg') }}
      b-list-group-item(v-if="belongToSur"): b-link.d-flex.justify-content-between.align-items-center(@click="setCurrentChannel('sur')")
        span 測量課
        b-badge(variant="primary" pill v-if="showUnread('sur')") {{ getUnread('sur') }}
      b-list-group-item(v-if="belongToAcc"): b-link.d-flex.justify-content-between.align-items-center(@click="setCurrentChannel('acc')")
        span 會計室
        b-badge(variant="primary" pill v-if="showUnread('acc')") {{ getUnread('acc') }}
      b-list-group-item(v-if="belongToHr"): b-link.d-flex.justify-content-between.align-items-center(@click="setCurrentChannel('hr')")
        span 人事室
        b-badge(variant="primary" pill v-if="showUnread('hr')") {{ getUnread('hr') }}
      b-list-group-item(v-if="belongToSupervisor"): b-link.d-flex.justify-content-between.align-items-center(@click="setCurrentChannel('supervisor')")
        span 主任祕書室
        b-badge(variant="primary" pill v-if="showUnread('supervisor')") {{ getUnread('supervisor') }}
      b-list-group-item: b-link.d-flex.justify-content-between.align-items-center(@click="setCurrentChannel('lds')")
        span 全所
        b-badge(variant="primary" pill v-if="showUnread('lds')") {{ getUnread('lds') }}
</template>

<script>
export default {
  data: () => ({
  }),
  computed: {
    belongToInf () { return this.userdept === 'inf' },
    belongToAdm () { return this.userdept === 'adm' },
    belongToVal () { return this.userdept === 'val' },
    belongToReg () { return this.userdept === 'reg' },
    belongToSur () { return this.userdept === 'sur' },
    belongToAcc () { return this.userdept === 'acc' },
    belongToHr () { return this.userdept === 'hr' },
    belongToSupervisor () { return this.userdept === 'supervisor' },
    isChat () { return this.currentChannel === 'chat'}
  },
  watch: {
    
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
    },
    setCurrentChannel (channel) {
      this.$store.commit('currentChannel', channel)
      // switch to new channel reset the unread number
      this.$store.commit("resetUnread", channel)
    }
  }
};
</script>

<style lang="scss" scoped>
.chat-container {
  margin: 5px;
  height: 81.5vh;
}

.chat-channel {
  width: 100%;
  height: 100%;
  overflow: auto;
  display: inline-block;
}
</style>