<template lang="pug">
  .chat-channel-list(v-if="isChat")
    b-list-group.gray-bottom-border(flush)
      b-list-group-item(v-for="(item, idx) in deptChannels" v-if="userdept === item.id || item.id === 'lds'" :key="`dept-key-${idx}`"): b-link.d-flex.justify-content-between.align-items-center(@click="setCurrentChannel(item.id)")
        span #[b-avatar.mt-n1(size="1.25rem" icon="people-fill")] {{ item.name }}
        b-badge(variant="primary" pill v-if="showUnread(item.id)") {{ getUnread(item.id) }}
    b-list-group.gray-bottom-border(flush)
      b-list-group-item(v-for="(item, idx) in talkedChannels" :key="`talked-key-${idx}`"): b-link.d-flex.justify-content-between.align-items-center(@click="setCurrentChannel(item.id)")
        span #[b-avatar.mt-n1(size="1.25rem" icon="chat-dots-fill")] {{ item.name }}
        b-badge(variant="primary" pill v-if="showUnread(item.id)") {{ getUnread(item.id) }}
</template>

<script>
export default {
  data: () => ({
    deptChannels: [
      { id: 'inf', name: '資訊課' },
      { id: 'adm', name: '行政課' },
      { id: 'reg', name: '登記課' },
      { id: 'val', name: '地價課' },
      { id: 'sur', name: '測量課' },
      { id: 'acc', name: '會計室' },
      { id: 'hr', name: '人事室' },
      { id: 'supervisor', name: '主任祕書室' },
      { id: 'lds', name: '全所' },
    ],
    talkedChannels: [
      { id: '0541_HB0542', name: '賴俋儒' },
      { id: '0541_HB0543', name: '葉宇敦' },
    ]
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
.chat-channel-list {
  margin: 5px;
  height: 89.5vh;
}

.gray-bottom-border {
  border-bottom: 1px solid rgb(199, 199, 199)
}
</style>