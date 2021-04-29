<template lang="pug">
  .vh-100.p-2(v-cloak)
    .mt-2: b-link.d-flex.justify-content-start.align-items-center(to="/home?reconnect=true" title="返回主畫面")
      b-icon.mr-1(icon="arrow-left-circle-fill" font-scale="2")
      span(style="font-size: 1.5rem;") 返回
    hr
    b-input-group.my-2
      template(#prepend)
        b-icon.my-auto.mr-2(icon="person-badge" font-scale="2.25" variant="secondary")
        span.my-auto 顯示姓名
      b-input.ml-2(v-model="nickname" placeholder="... 顯示名稱 ..." trim readonly)
    b-input-group.my-2
      template(#prepend)
        b-icon.my-auto.mr-2(icon="unlock-fill" font-scale="2.25" variant="secondary")
        span.my-auto 網域密碼
      b-input.ml-2(:type="adPasswordType" v-model="adPassword" :placeholder="`${userid}的網域密碼`" trim)
      b-icon.my-auto.ml-2.eye(ref="eye" :icon="adPasswordIcon" font-scale="1.25" variant="secondary" @click="switchAdPasswordIcon")
    b-input-group.my-2
      template(#prepend)
        b-icon.my-auto.mr-2(icon="building" font-scale="2.25" variant="secondary")
        span.my-auto 所屬部門
      b-select.ml-2(v-model="department" :options="departmentOpts" :state="validDepartment")

    b-input-group.my-2
      template(#prepend)
        b-icon.my-auto.mr-2(icon="app-indicator" font-scale="2.25" variant="secondary")
        span.my-auto 提示效果
      b-select.ml-2(v-model="effectVal" :options="effectOpts")

    b-input-group.my-2(title="歷史訊息")
      template(#prepend)
        b-icon.my-auto.mr-2(icon="filter" font-scale="2.25" variant="secondary")
        span.my-auto 回朔數量
      b-select.ml-2(v-model="historyCount" :options="[5, 10, 15, 20, 25, 30]")

    b-input-group.my-2
      template(#prepend)
        b-icon.my-auto.mr-2(icon="server" font-scale="2.25" variant="secondary")
        span.my-auto 連線主機
      b-input.ml-2(v-model="wsHost" :state="validHost" trim)
      span.my-auto.mx-1 :
      b-input(v-model="wsPort" type="number" min="1025" max="65535" :state="validPort" style="max-width: 100px;")

    b-input-group.my-2
      template(#prepend)
        b-icon.my-auto.mr-2(icon="cpu" font-scale="2.25" variant="secondary")
        span.my-auto 查詢主機
      b-input.ml-2(v-model="wsHost" :state="validHost" trim readonly)
      span.my-auto.mx-1 :
      b-input(v-model="apiPortSetting" type="number" min="80" max="65535" :state="validApiPort" style="max-width: 100px;")

    b-input-group.my-2
      template(#prepend)
        b-icon.my-auto.mr-2(icon="card-list" font-scale="2.25" variant="secondary")
        span.my-auto ＡＤ主機
      b-input.ml-2(v-model="adHost" placeholder="... AD伺服器IP ..." :state="validAdHost" trim)
    
    b-button.mx-auto.clear(variant="outline-danger" block @click="clear")
      b-icon.mr-1(icon="exclamation-triangle" font-scale="1.25")
      span.my-auto 清除所有設定
    
    status
</template>

<script>
import trim from 'lodash/trim'
import isEmpty from 'lodash/isEmpty'

export default {
  transition: 'list',
  head: {
    title: `信差即時通-設定`
  },
  asyncData ({ req, store, redirect, error }) {
    return {
      
    }
  },
  data: () => ({
    ipFilter: /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/,
    adHost: '',
    wsHost: '',
    wsPort: 8081,
    apiPortSetting: 80,
    adPassword: '',
    adPasswordType: 'password',
    adPasswordIcon: 'eye-slash',
    nickname: '',
    historyCount: 10,
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
    ],
    effectVal: '',
    effectOpts: [ '', 'bounce', 'flash', 'pulse', 'rubberBand', 'shakeX', 'shakeY', 'headShake', 'swing', 'tada', 'wobble' ],
  }),
  computed: {
    wsConnStr() {
      return `ws://${this.wsHost}:${this.wsPort}`
    },
    validAdHost() { return this.ipFilter.test(this.adHost) === false ? false : null },
    validHost() { return this.ipFilter.test(this.wsHost) === false ? false : null },
    validPort() {
      const i = parseInt(trim(this.wsPort))
      return (i > 1024 && i < 65536) === false ? false : null
    },
    validApiPort() {
      const i = parseInt(trim(this.apiPortSetting))
      return (i > 79 && i < 65536) === false ? false : null
    },
    validNickname() { return !isEmpty(trim(this.nickname)) },
    validDepartment() { return isEmpty(trim(this.department)) === true ? false : null },
    validInformation() { return !isEmpty(this.userid) && this.validNickname && this.validDepartment === null && this.validPort === null && this.validHost === null },

    stickyChannels() { return ['announcement', this.userid, 'chat'] },
    inChatting() { return !this.stickyChannels.includes(this.currentChannel) },

    platform() { return `${this.os.logofile.replace(/(^|\s)\S/g, l => l.toUpperCase())} ${this.os.kernel}`}
  },
  watch: {
    adHost(val) {
      this.$localForage.setItem('adHost', val)
      this.$store.commit('ad', val)
    },
    adPassword(val) {
      this.$localForage.setItem('adPassword', val)
      this.$store.commit('password', val)
    },
    wsHost(val) {
      this.$localForage.setItem('wsHost', val)
    },
    wsPort(val) {
      this.$localForage.setItem('wsPort', val)
    },
    apiPortSetting(val) {
      this.$localForage.setItem('apiPort', val)
      this.$store.commit('apiPort', val)
    },
    nickname(val) {
      this.$store.commit('username', val)
      this.$localForage.setItem('nickname', val)
    },
    department(val) {
      this.$store.commit('userdept', val)
      this.$localForage.setItem('department', val)
    },
    effectVal(val) {
      this.$store.commit('effect', val)
      this.$localForage.setItem('effect', val)
    },
    historyCount (val) {
      this.$store.commit('history', this.historyCount)
      this.$localForage.setItem('history', this.historyCount)
    }
  },
  methods: {
    switchAdPasswordIcon() {
      if (this.adPasswordIcon === 'eye') {
        this.adPasswordIcon = 'eye-slash'
        this.adPasswordType = 'password'
      } else {
        this.adPasswordIcon = 'eye'
        this.adPasswordType = 'text'
      }
    },
    async loadUserMapData() {
      // refresh user name mapping from API server
      const queryEP = `http://${this.wsHost || await this.$localForage.getItem('wsHost')}:${this.apiPort}${this.$consts.API.JSON.USER}`
      this.$axios.post(queryEP, {
        type: 'user_mapping'
      }).then(({ data }) => {
        if (this.$utils.statusCheck(data.status)) {
          this.$store.commit('userMap', data.data)
          this.$localForage.setItem('userMap', data.data)
        } else {
          this.warning(data.message)
        }
      }).catch((err) => {
        this.error(err.toString())
      }).finally(() => {
      })
    },
    async restore() {
      // restore last settings
      this.nickname = await this.$localForage.getItem('nickname')
      this.empty(this.nickname) && (this.nickname = this.userid)
      this.department = await this.$localForage.getItem('department')
      this.adHost = await this.$localForage.getItem('adHost')
      this.adPassword = await this.$localForage.getItem('adPassword')
      this.wsHost = await this.$localForage.getItem('wsHost')
      this.wsPort = await this.$localForage.getItem('wsPort')
      this.effectVal = await this.$localForage.getItem('effect')
      this.historyCount = await this.$localForage.getItem('history') || 10
      this.apiPortSetting = await this.$localForage.getItem('apiPort') || 80
    },
    clear() {
      this.confirm(`清除所有已儲存的設定？`).then((answer) => {
        if (answer) {
          this.$localForage.removeItem('nickname')
          this.$localForage.removeItem('department')
          this.$localForage.removeItem('adPassword')
          this.$localForage.removeItem('effect')
          this.$localForage.removeItem('history')
          this.$localForage.removeItem('apiPort')
          this.restore()
        }
      })
    }
  },
  mounted() {
    this.restore()
    this.clearReconnectTimer()
    this.loadUserMapData()
  },
  destroyed() {
    this.closeWebsocket()
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
.clear {
  position: absolute;
  left: 5px;
  bottom: calc(2rem);
  max-width: 98%;
}
.eye {
  cursor: pointer;
  position: absolute;
  right: .55rem;
  top: .55rem;
}
</style>
