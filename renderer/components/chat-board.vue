<template lang="pug">
.chat-channel-list(v-if="isChat")
  b-list-group.gray-bottom-border(
    v-if="isNotifyMgtStaff"
    flush
  )
    b-list-group-item.d-flex.justify-content-between.align-items-center(key="dept-key-b-select")
      .d-flex.align-items-center
        b-icon(font-scale="1.75" icon="chat-dots" variant="primary")
        b-button.mx-2.text-nowrap(@click="setCurrentChannel(selectedDeptChannel)", size="sm", variant="primary") 進入
        b-select(v-model="selectedDeptChannel", :options="deptChannelsOpts", size="sm")
        .text-nowrap.ml-2 頻道
      b-badge(variant="primary" pill v-if="showUnread(selectedDeptChannel)") {{ getUnread(selectedDeptChannel) }}
    b-list-group-item(key="dept-key-lds"): b-link.d-flex.justify-content-between.align-items-center(@click="setCurrentChannel('lds')")
      .d-flex.align-items-center
        b-icon.mr-2(font-scale="1.75" icon="chat-dots" variant="primary")
        span 進入 #[strong.mark.text-primary 全事務所] 頻道
      b-badge(variant="primary" pill v-if="showUnread('lds')") {{ getUnread('lds') }}

  b-list-group.gray-bottom-border(
    v-else,
    flush
  )
    b-list-group-item(
      v-for="(item, idx) in deptChannels"
      v-if="userdept === item.id || item.id === 'lds'"
      :key="`dept-key-${idx}`"
    ): b-link.d-flex.justify-content-between.align-items-center(@click="setCurrentChannel(item.id)")
      //- span #[b-avatar.mt-n1(size="1.25rem" icon="people-fill")] {{ item.name }}
      .d-flex.align-items-center
        b-icon.mr-2(font-scale="1.75" icon="chat-dots" variant="primary")
        span 進入 #[strong.mark.text-primary {{ item.name }}] 頻道
      b-badge(variant="primary" pill v-if="showUnread(item.id)") {{ getUnread(item.id) }}

  //- h6.my-2 #[b-icon(icon="info-circle" variant="primary")] 如欲發送 #[a.mark.font-weight-bold(:href="`${feQueryUrl}/message`") 群組私訊] / #[a.mark(:href="`${feQueryUrl}/notification`") 公告] 訊息也可至 #[a.mark(:href="feQueryUrl") 地政智慧控管系統]
  h6.d-flex.align-items-center.mt-2
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
  b-list-group.mt-n1(
    flush
    :class="['online-users-list']"
  ): b-list-group-item(
    v-for="(deptList, idx) in onlineUsersByDept"
    :key="`dept_${idx}`"
    v-if="deptList.users.length > 0"
  ): .d-flex.align-items-start
    .text-nowrap.mr-auto.lah-shadow
      b-link(v-if="isNotifyMgtStaff", @click="setCurrentChannel(deptList.id)") {{ deptList.text }} #[b-badge(variant="success" pill) {{ deptList.users.length }}]
      span(v-else) {{ deptList.text }} #[b-badge(variant="success" pill) {{ deptList.users.length }}]
    b-avatar-group(size="3rem" :overlap="overlapRatio(deptList.users.length)"): transition-group.d-flex.justify-content-end.flex-wrap(name="listY" mode="out-in"): user-avatar.shadow(
      v-for="(user, uidx) in deptList.users"
      :key="`avatar_${user ? user.userid : 'unknown'}_${uidx}`"
      :user-data="user"
    )
</template>

<script>
import UserAvatar from '~/components/user-avatar.vue';

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
    deptChannelsOpts: [
      { text: '資訊課', value: 'inf' },
      { text: '登記課', value: 'reg' },
      { text: '地價課', value: 'val' },
      { text: '測量課', value: 'sur' },
      { text: '行政課', value: 'adm' },
      { text: '人事室', value: 'hr' },
      { text: '會計室', value: 'acc' },
      { text: '主任祕書室', value: 'supervisor' }
    ],
    selectedDeptChannel: 'lds',
    onlineTimer: undefined,
    ascending: false,
    keyword: ''
  }),
  computed: {
    isChat () { return this.currentChannel === 'chat'},
    isNotifyMgtStaff () { return this.authority.isNotifyMgtStaff || this.authority.isAdmin },
    onlineUsersByDept () {
      const keyword = this.keyword
      const filter = [
        { text: '資訊課', users: [], id: 'inf' },
        { text: '登記課', users: [], id: 'reg' },
        { text: '地價課', users: [], id: 'val' },
        { text: '測量課', users: [], id: 'sur' },
        { text: '行政課', users: [], id: 'adm' },
        { text: '人事室', users: [], id: 'hr' },
        { text: '會計室', users: [], id: 'acc' },
        { text: '主任祕書室', users: [], id: 'supervisor' },
        { text: '無歸屬', users: [], id: 'none' }
      ]
      for (let i = 0; i < this.connectedUsersCount; i++) {
        const user = this.connectedUsers[i]
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
      }
      return filter.sort((a, b) => {
        if (a.users.length > b.users.length) { return this.ascending ? 1 : -1 }
        if (a.users.length < b.users.length) { return this.ascending ? -1: 1 }
        return 0
      })
    },
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
    this.queryOnlineClients()
    clearInterval(this.onlineTimer)
    this.onlineTimer = setInterval(() => this.queryOnlineClients(), 5 * 60 * 1000)
    this.ascending = await this.$localForage.getItem('online-ascending') || false
    this.selectedDeptChannel = this.userdept
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
  height: 66.5vh;
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