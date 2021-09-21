<template lang="pug">
  div: lah-transition(mode="out-in")
    h3.center(v-if="loading")
      b-icon(icon="slash-circle" animation="spin")
    h4.center(v-else-if="!found")
      b-icon(icon="exclamation-circle-fill" variant="danger")
      span.ml-1 找不到使用者資料
    b-card(v-else)
      b-card-title.
        #[b-avatar.mt-n1(button variant="light" size="1.3em" :src="avatarSrc" @click="photoClick")]
        {{ userData.name }}

      b-card-sub-title.d-flex
        span.mr-auto {{ userData.title }}

      b-card-text
        .d-flex
          .d-flex.flex-column.small.mr-auto
            div ＩＤ：{{ userData.id }}
            div(v-if="userData.ip") 電腦：{{ userData.ip }}
            div(v-if="userData.ext") 分機：{{ userData.ext }}
            div(v-if="userData.unit") 部門：{{ userData.unit }}
            div(v-if="userData.work") 工作：{{ userData.work }}
          .d-flex.small
            b-textarea(
              ref="userText"
              v-model="message"
              debounce="200"
              placeholder="... 留言給他/她 ..."
              size="sm"
              @keyup.enter.exact="sendMessage"
              no-resize
              no-auto-shrink
              autofocus
            )
            b-button.mx-1(
              @click="sendMessage"
              size="sm"
              :disabled="isMessageEmpty"
              variant="outline-primary"
            )
              //- b-icon.mr-1(icon="cursor")
              span 傳送

      .d-flex.flex-column(md="6")
        b-link(@click="photoClick" title="放大顯示")
          b-img-lazy.shadow(
            :src="photoSrc"
            :alt="userData.name"
            fluid
            thumbnail
            rounded
          )
</template>

<script>
export default {
  name: 'UserCard',
  props: {
    id: { type: String, default: '' },
    name: { type: String, default: '' }
  },
  data: () => ({
    userData: {
      id: '',
      name: '',
      sex: '',
      title: '',
      work: '',
      ext: '',
      birthday: '',
      unit: '',
      ip: '',
      education: '',
      exam: '',
      cell: '',
      onboard_date: '',
      authority: 0
    },
    loading: true,
    message: ''
  }),
  computed: {
    isMessageEmpty () { return this.$utils.empty(this.message) },
    found () { return !this.$utils.empty(this.userData.id) },
    photoSrc () {
      return this.avatarSrc.replaceAll('_avatar', '')
    },
    avatarSrc () {
      return `http://${this.apiHost}:${this.apiPort}/get_user_img.php?id=${this.id}_avatar&name=${this.name}_avatar`
    }
  },
  fetch () {
    this.isBusy = false
    this.loading = true
    this.$axios.post(this.$consts.API.JSON.USER, {
      type: 'user_info',
      id: this.id,
      name: this.name
    }).then(({ data }) => {
      if (this.$utils.statusCheck(data.status)) {
        if (data.data_count > 1) {
          this.userData = data.raw.find((item, idx, array) => {
            return (item.authority & this.$consts.AUTHORITY.DISABLED) !== this.$consts.AUTHORITY.DISABLED
          }) || {}
        } else {
          this.userData = data.raw[0]
        }
      } else {
        this.warn(data.message)
      }
    }).catch((err) => {
      this.err(err)
    }).finally(() => {
      this.isBusy = false
      this.loading = false
    })
  },
  methods: {
    sendMessage () {
      if (this.websocket && !this.isMessageEmpty) {
        this.websocket.send(this.packMessage(this.message, { channel: this.userData.id }))
        // also send to own channel to simulate talking between eachothers
        this.websocket.send(this.packMessage(`@${this.userData.name}<hr/>${this.message}`, { channel: this.userid }))
      }
      this.message = ''
      this.$refs.userText && this.$refs.userText.focus()
    },
    photoClick () {
      this.modal(this.$createElement('b-img', {
        attrs: {
          src: this.photoSrc,
          alt: `${this.userData.id} ${this.userData.name} 照片`
        },
        class: {
          'img-fluid': true,
          'img-thumbnail': true
        }
      }), {
        title: `${this.userData.id} ${this.userData.name} 照片`,
        size: 'xl'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
