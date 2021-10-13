<template lang="pug">
  .chat-channel-list(v-if="isChat")
    b-list-group.gray-bottom-border(flush)
      b-list-group-item(v-for="(item, idx) in deptChannels" v-if="userdept === item.id || item.id === 'lds'" :key="`dept-key-${idx}`"): b-link.d-flex.justify-content-between.align-items-center(@click="setCurrentChannel(item.id)")
        span #[b-avatar.mt-n1(size="1.25rem" icon="people-fill")] {{ item.name }}
        b-badge(variant="primary" pill v-if="showUnread(item.id)") {{ getUnread(item.id) }}

      //- h5.my-2 此處為群組聊天看板，可以隨時留信息到各房間
    h6.my-2 #[b-icon(icon="info-circle" variant="primary")] 如欲發送 #[a.mark.font-weight-bold(:href="`${feQueryUrl}/message`") 群組私訊] / #[a.mark(:href="`${feQueryUrl}/notification`") 公告] 訊息也可至 #[a.mark(:href="feQueryUrl") 地政智慧管控系統]
    h6 #[b-icon(icon="people-fill")] 線上使用者 #[b-badge(pill variant="success") {{ connectedUsersCount }}]
    //- show online user badges
    b-avatar-group(size="3rem" :overlap="overlapRatio"): .d-flex.justify-content-center.flex-wrap: user-avatar(
      v-for="(user, idx) in connectedUsers"
      :key="`avatar_${user.userid}_${idx}`"
      :user-data="user"
      :class="connectedUsersCount <= 30 ? ['m-1'] : []"
    )
</template>

<script>
import UserAvatar from '~/components/user-avatar.vue'

export default {
  components: { UserAvatar },
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
    onlineTimer: undefined
  }),
  computed: {
    isChat () { return this.currentChannel === 'chat'},
    overlapRatio () {
      if (this.connectedUsersCount > 60) { return 0.1 }
      if (this.connectedUsersCount > 90) { return 0.2 }
      if (this.connectedUsersCount > 120) { return 0.3 }
      if (this.connectedUsersCount > 150) { return 0.4 }
      return 0.0
    }
  },
  created () {
    this.queryChatChannelOnlineClients()
    this.onlineTimer = setInterval(() => this.queryChatChannelOnlineClients(), 5 * 60 * 1000)
  },
  beforeDestroy() {
    clearInterval(this.onlineTimer) 
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

.list-group-item .badge {
  opacity: 0.75;
}

.list-group-item:hover .badge {
  opacity: 1;
}
</style>