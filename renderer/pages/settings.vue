<template lang="pug">
  .vh-100.p-2(v-cloak)
    .mt-2: b-link.d-flex.justify-content-start.align-items-center(to="/home")
      b-icon.mr-1(icon="arrow-left-circle-fill" font-scale="2" title="返回主畫面")
      span(style="font-size: 1.5rem;") 返回
    hr
    b-input-group.my-2
      template(#prepend)
        b-icon.my-auto.mr-2(icon="person-badge" font-scale="2.25" variant="secondary")
        span.my-auto 顯示名稱
      b-input.ml-2(v-model="nickname" placeholder="... 顯示姓名 ..." trim :state="validNickname")
    b-input-group.my-2
      template(#prepend)
        b-icon.my-auto.mr-2(icon="building" font-scale="2.25" variant="secondary")
        span.my-auto 所屬部門
      b-select.ml-2(v-model="department" :options="departmentOpts" :state="validDepartment")

    b-input-group.my-2
      template(#prepend): b-icon.my-auto.mr-2(icon="server" font-scale="2.25" variant="secondary")
      b-input(v-model="wsHost" @keyup.enter.exact="manualConnect" :state="validHost" trim)
      span.my-auto.mx-1 :
      b-input.mr-1(v-model="wsPort" type="number" min="1025" max="65535" :state="validPort" style="max-width: 75px;")
    
    b-button(variant="outline-danger" block @click="clear") 清除所有設定
    
    .bottom-left.d-flex.justify-content-end.text-muted.s-75
      div {{ domain }} \ {{ userid }}
    .bottom-right.text-muted.s-75.text-right
      div {{ ip }} / {{ platform }}
</template>

<script>
import trim from 'lodash/trim'
import isEmpty from 'lodash/isEmpty'
import debounce from 'lodash/debounce'

export default {
  head: {
    title: `信差即時通-設定`
  },
  asyncData ({ req, store, redirect, error }) {
    return {
      
    }
  },
  data: () => ({
    wsHost: '127.0.0.1',
    wsPort: 8081,
    nickname: '',
    department: '',
    departmentOpts: [
      { value: '', text: '請選擇部門' },
      { value: 'inf', text: '資訊課' },
      { value: 'adm', text: '行政課' },
      { value: 'reg', text: '登記課' },
      { value: 'sur', text: '測量課' },
      { value: 'val', text: '地價課' },
      { value: 'hr', text: '人事室' },
      { value: 'acc', text: '會計室' },
      { value: 'supervisor', text: '主任秘書室' },
    ]
  }),
  computed: {
    wsConnStr() {
      return `ws://${this.wsHost}:${this.wsPort}`
    },
    validHost() { return isEmpty(trim(this.wsHost)) === true ? false : null },
    validPort() {
      const i = parseInt(trim(this.wsPort))
      return i < 1025 || i > 65535 ? false : null
    },
    validNickname() { return !isEmpty(trim(this.nickname)) },
    validDepartment() { return !isEmpty(trim(this.department)) },
    validInformation() { return !isEmpty(this.userid) && this.validNickname && this.validDepartment && this.validPort === null && this.validHost === null },
    list() {
      return this.messages[this.currentChannel]
    },

    stickyChannels() { return ['announcement', this.userid, 'chat'] },
    inChatting() { return !this.stickyChannels.includes(this.currentChannel) },

    platform() { return `${this.os.logofile.replace(/(^|\s)\S/g, l => l.toUpperCase())} ${this.os.kernel}`}
  },
  watch: {
    wsHost(val) {
      this.$localForage.setItem('wsHost', val)
    },
    wsPort(val) {
      this.$localForage.setItem('wsPort', val)
    },
    nickname(val) {
      this.$store.commit('username', val)
      this.$localForage.setItem('nickname', val)
    },
    department(val) {
      this.$store.commit('userdept', val)
      this.$localForage.setItem('department', val)
    }
  },
  methods: {
    async restore() {
      // restore last settings
      this.nickname = await this.$localForage.getItem('nickname')
      this.department = await this.$localForage.getItem('department')
      this.wsHost = await this.$localForage.getItem('wsHost')
      this.wsPort = await this.$localForage.getItem('wsPort')
    },
    clear() {
      this.confirm(`清除所有已儲存的設定？`).then((answer) => {
        answer && this.$localForage.clear()
        this.restore()
      })
    }
  },
  created() {
    this.restore()
  }
}
</script>

<style lang="scss" scoped>
.color-primary {
  color: #007bff;
}
.vh-100 {
  height: 100vh;
}
.logo {
  position: absolute;
  left: 80px;
  top: 100px;
}
.bottom-right {
  position: absolute;
  right: .5rem;
  bottom: .5rem;
}
.bottom-left {
  position: absolute;
  left: .5rem;
  bottom: .5rem;
}
</style>
