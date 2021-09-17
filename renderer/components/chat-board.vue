<template lang="pug">
  .chat-channel-list(v-if="isChat")
    b-list-group.gray-bottom-border(flush)
      b-list-group-item(v-for="(item, idx) in deptChannels" v-if="userdept === item.id || item.id === 'lds'" :key="`dept-key-${idx}`"): b-link.d-flex.justify-content-between.align-items-center(@click="setCurrentChannel(item.id)")
        span #[b-avatar.mt-n1(size="1.25rem" icon="people-fill")] {{ item.name }}
        b-badge(variant="primary" pill v-if="showUnread(item.id)") {{ getUnread(item.id) }}
    h5.my-2.text-center 此處為群組聊天看板，可以隨時留信息到各房間
    h5.my-2.text-center 如欲發送 #[a(:href="`http://${this.apiHost}:${this.fePort}/message`") 信差] / #[a(:href="`http://${this.apiHost}:${this.fePort}/notification`") 公告] 訊息請至 #[a(:href="`http://${this.apiHost}:${this.fePort}`") 地政智慧管控系統]
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
    ]
  }),
  computed: {
    isChat () { return this.currentChannel === 'chat'}
  },
  watch: { },
  methods: { }
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

.list-group-item .badge {
  opacity: 0.75;
}

.list-group-item:hover .badge {
  opacity: 1;
}
</style>