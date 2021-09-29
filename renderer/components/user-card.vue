<template lang="pug">
  div: lah-transition(mode="out-in")
    h3.center(v-if="loading")
      //- b-icon(icon="slash-circle" animation="spin")
      b-iconstack(font-scale="2" animation="cylon")
        b-icon(
          stacked
          icon="slash-circle"
          animation="spin"
        )
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
          b-button(variant="outline-primary" @click="open") 私訊
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
import MessageInput from '~/components/message-input.vue'

export default {
  name: 'UserCard',
  components: { MessageInput },
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
    queryUrl () { return `${this.apiQueryUrl}${this.$consts.API.JSON.USER}` },
    avatarSrc () { return `${this.apiQueryUrl}/get_user_img.php?id=${this.id}_avatar&name=${this.name}_avatar` }
  },
  fetch () {
    this.isBusy = false
    this.loading = true
    this.$axios.post(this.queryUrl, {
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
    open () {
      this.modal(this.$createElement(MessageInput, {
        props: {
          to: this.userData.id
        },
        on: {
          sent: () => { this.hideModalById('leave-message-modal') }
        }
      }), {
        id: 'leave-message-modal',
        size: 'xl',
        title: `給 ${this.userData.id} ${this.userData.name}`
      })
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
