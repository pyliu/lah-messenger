<template lang="pug">
.chat-channel-list(v-if="isChat")
  b-list-group.gray-bottom-border(flush)
    b-list-group-item(v-for="(item, idx) in deptChannels" v-if="userdept === item.id || item.id === 'lds'" :key="`dept-key-${idx}`"): b-link.d-flex.justify-content-between.align-items-center(@click="setCurrentChannel(item.id)")
      //- span #[b-avatar.mt-n1(size="1.25rem" icon="people-fill")] {{ item.name }}
      .d-flex.align-items-center
        b-icon.mr-2(font-scale="1.75" icon="chat-dots" variant="primary")
        span 進入 #[strong.mark.text-primary {{ item.name }}] 頻道
      b-badge(variant="primary" pill v-if="showUnread(item.id)") {{ getUnread(item.id) }}

  h6.my-2 #[b-icon(icon="info-circle" variant="primary")] 如欲發送 #[a.mark.font-weight-bold(:href="`${feQueryUrl}/message`") 群組私訊] / #[a.mark(:href="`${feQueryUrl}/notification`") 公告] 訊息也可至 #[a.mark(:href="feQueryUrl") 地政智慧管控系統]
  h6.d-flex.align-items-center
    .mr-auto
      b-icon(icon="people-fill")
      span.mx-1 線上使用者
      b-badge(pill :variant="connectedUsersBadgeVariant") {{ connectedUsersCount }}
    b-input.mx-2(
      v-model="keyword",
      title="輸入關鍵字篩選線上使用者",
      placeholder="... 關鍵字篩選 ...",
      size="sm",
      style="max-width: 150px"
      trim
    )
    b-checkbox(
      v-model="ascending"
      v-b-tooltip="'優先顯示人數較少的部門'"
      size="sm"
      switch
    )
      b-icon(icon="filter" rotate="180" font-scale="1.25")
  b-list-group.online-users-list.mt-n1(flush): b-list-group-item(
    v-for="(deptList, idx) in onlineUsersByDept"
    :key="`dept_${idx}`"
    v-if="deptList.users.length > 0"
  ): .d-flex.align-items-start
    .text-nowrap.mr-auto.lah-shadow {{ deptList.text }} #[b-badge(variant="success" pill) {{ deptList.users.length }}]
    b-avatar-group(size="3rem" :overlap="overlapRatio(deptList.users.length)"): transition-group.d-flex.justify-content-end.flex-wrap(name="listY" mode="out-in"): user-avatar.shadow(
      v-for="(user, uidx) in deptList.users"
      :key="`avatar_${user ? user.userid : 'unknown'}_${uidx}`"
      :user-data="user"
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
    onlineTimer: undefined,
    ascending: false,
    keyword: ''
  }),
  computed: {
    isChat () { return this.currentChannel === 'chat'},
    onlineUsersByDept () {
      const keyword = this.keyword
      const filter = [
        { text: '資訊課', users: [] },
        { text: '登記課', users: [] },
        { text: '地價課', users: [] },
        { text: '測量課', users: [] },
        { text: '行政課', users: [] },
        { text: '人事室', users: [] },
        { text: '會計室', users: [] },
        { text: '主任祕書室', users: [] },
        { text: '無歸屬', users: [] }
      ]
      this.connectedUsers?.forEach(user => {
        if (
          this.$utils.empty(keyword) ||
          user.userid?.includes(keyword) ||
          user.username?.includes(keyword)
        ) {
          switch (user?.dept) {
            case 'inf':
              filter[0].users.push(user)
              break
            case 'reg':
              filter[1].users.push(user)
              break
            case 'val':
              filter[2].users.push(user)
              break
            case 'sur':
              filter[3].users.push(user)
              break
            case 'adm':
              filter[4].users.push(user)
              break
            case 'hr':
              filter[5].users.push(user)
              break
            case 'acc':
              filter[6].users.push(user)
              break
            case 'supervisor':
              filter[7].users.push(user)
              break
            default:
              filter[8].users.push(user)
          }
        }
      });
      return filter.sort((a, b) => {
        if (a.users.length > b.users.length) { return this.ascending ? 1 : -1 }
        if (a.users.length < b.users.length) { return this.ascending ? -1: 1 }
        return 0
      })
    },
    // onlineUsersByDept () {
    //   const filter = [
    //     { text: '資訊課', users: [] },
    //     { text: '登記課', users: [] },
    //     { text: '地價課', users: [] },
    //     { text: '測量課', users: [] },
    //     { text: '行政課', users: [] },
    //     { text: '人事室', users: [] },
    //     { text: '會計室', users: [] },
    //     { text: '主任祕書室', users: [] },
    //     { text: '無歸屬', users: [] }
    //   ]
    //   this.connectedUsers?.forEach(user => {
    //     switch (user?.dept) {
    //       case 'inf':
    //         filter[0].users.push(user)
    //         break
    //       case 'reg':
    //         filter[1].users.push(user)
    //         break
    //       case 'val':
    //         filter[2].users.push(user)
    //         break
    //       case 'sur':
    //         filter[3].users.push(user)
    //         break
    //       case 'adm':
    //         filter[4].users.push(user)
    //         break
    //       case 'hr':
    //         filter[5].users.push(user)
    //         break
    //       case 'acc':
    //         filter[6].users.push(user)
    //         break
    //       case 'supervisor':
    //         filter[7].users.push(user)
    //         break
    //       default:
    //         filter[8].users.push(user)
    //     }
    //   });
    //   return filter.sort((a, b) => {
    //     if (a.users.length > b.users.length) { return this.ascending ? 1 : -1 }
    //     if (a.users.length < b.users.length) { return this.ascending ? -1: 1 }
    //     return 0
    //   })
    // },
    connectedUsersBadgeVariant () {
      if (this.connectedUsersCount > 100) {
        return 'danger'
      }
      if (this.connectedUsersCount > 75) {
        return 'warning'
      }
      return 'success'
    }
  },
  watch: {
    ascending (flag) { this.$localForage.setItem('online-ascending', flag) }
  },
  async created () {
    this.queryChatChannelOnlineClients()
    this.onlineTimer = setInterval(() => this.queryChatChannelOnlineClients(), 5 * 60 * 1000)
    this.ascending = await this.$localForage.getItem('online-ascending') || false
  },
  beforeDestroy() {
    clearInterval(this.onlineTimer) 
  },
  methods: {
    overlapRatio (count) {
      if (count < 8) { return 0.0 }
      if (count < 10) { return 0.3 }
      if (count < 20) { return 0.4 }
      if (count < 64) { return 0.5 }
      return 0.6
    }
  }
};
</script>

<style lang="scss" scoped>
.chat-channel-list {
  margin: 5px;
  height: 86.5vh;
}

.online-users-list {
  height: 62.5vh;
  overflow: auto;
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