<template lang="pug">
  b-avatar(
    :src="avatarSrc"
    :title="tip"
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
    size: { type: String, default: '2rem'}
  },
  data: () => ({
  }),
  computed: {
    uid () { return this.userData?.userid },
    uname () { return this.userData?.username || this.userMap[this.userData?.userid] || this.userData?.userid },
    avatarSrc () { return `${this.apiQueryUrl}/get_user_img.php?id=${this.uid}_avatar&name=${this.uname}_avatar` },
    tip () { return this.userData.timestamp ? `${this.uname} 登入時間：${this.$utils.tsAd(this.userData.timestamp).split(' ')[1]}` : this.uname }
  },
  methods: {
    click (event) {
      event.stopPropagation()
      event.preventDefault()
      this.modal(this.$createElement('user-card', {
        props: {
          id: this.uid,
          name: this.uname
        }
      }), {
        title: this.uname,
        size: 'xl'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
