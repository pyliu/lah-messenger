<template lang="pug">
  b-avatar(
    :src="avatarSrc"
    :title="userMap[userData.userid] || userData.username || userData.userid"
    :size="size"
    button
    @click="click"
  )
</template>

<script>
import UserCard from '~/components/user-card.vue'

export default {
  name: 'UserAvatar',
  components: { UserCard },
  props: {
    userData: { type: Object, require: true },
    size: { type: String, default: ''}
  },
  data: () => ({
  }),
  computed: {
    avatarSrc () { return `${this.apiQueryUrl}/get_user_img.php?id=${this.userData?.userid || this.id}_avatar&name=${this.userData?.username}_avatar` }
  },
  fetch () {
    // if (this.$utils.empty(this.userData)) {
    //   this.$axios.post(this.queryUrl, {
    //     type: 'user_info',
    //     id: this.id
    //   }).then(({ data }) => {
    //     if (this.$utils.statusCheck(data.status)) {
    //       if (data.data_count > 1) {
    //         this.userData = {...data.raw.find((item, idx, array) => {
    //           return (item.authority & this.$consts.AUTHORITY.DISABLED) !== this.$consts.AUTHORITY.DISABLED
    //         }) || {}}
    //       } else {
    //         this.userData = {...data.raw[0]}
    //       }
    //     } else {
    //       this.warn(data.message)
    //     }
    //   }).catch((err) => {
    //     this.err(err)
    //   }).finally(() => {
    //     this.isBusy = false
    //   })
    // }
  },
  methods: {
    click (event) {
      event.stopPropagation()
      this.modal(this.$createElement('user-card', {
        props: {
          id: this.userData.userid,
          name: this.userData.username
        }
      }), {
        title: `${this.userMap[this.userData.userid] || this.userData.username || this.userData.userid}`,
        size: 'xl'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
