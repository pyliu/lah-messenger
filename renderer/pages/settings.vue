<template lang="pug">
.vh-100.p-2.gradient-top(v-cloak)
  .mt-2.d-flex.align-items-center
    nuxt-link.mr-auto(to="/home" title="返回主畫面")
      b-icon.mr-1(icon="arrow-left-circle-fill" font-scale="2")
      span(style="font-size: 1.5rem;") 返回
    
    div
      b-button.mr-1(variant="warning" @click="logout" title="清除已登入資料")
        b-icon.mr-1(icon="box-arrow-left" font-scale="1.25")
        span.my-auto 登出
      //- b-button(variant="danger" @click="quit")
      //-   b-icon.mr-1(icon="x-circle" font-scale="1.25")
      //-   span 關閉程式
    
  fieldset
    legend 個人設定
    b-input-group.my-2
      template(#prepend)
        b-icon.my-auto.mr-2(icon="person-badge" font-scale="2.25" variant="secondary")
        span.my-auto 顯示姓名
      b-input.ml-2(v-model="adName" placeholder="... 顯示名稱 ..." trim :disabled="!authority.isAdmin")
    b-input-group.my-2
      template(#prepend)
        b-icon.my-auto.mr-2(icon="unlock-fill" font-scale="2.25" variant="secondary")
        span.my-auto 網域密碼
      b-input.ml-2(:type="adPasswordType" v-model="adPassword" :placeholder="`${userid}的網域密碼`" trim @change="queryAd")
      b-icon.my-auto.ml-2.eye(ref="eye" :icon="adPasswordIcon" font-scale="1.25" variant="secondary" @click="switchAdPasswordIcon")
      b-button.ml-1(@click="queryAd" :disabled="!validAdInfo" :variant="validAdInfo ? 'primary' : 'danger'" title="透過AD驗證") 驗證
    b-input-group.my-2
      template(#prepend)
        b-icon.my-auto.mr-2(icon="building" font-scale="2.25" variant="secondary")
        span.my-auto 所屬部門
      b-select.ml-2(
        v-model="department",
        :options="departmentOpts",
        :state="validDepartment",
        :disabled="!isAdmin"
      )

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
    
    b-input-group.my-2(title="收到訊息時是否啟用彈出主視窗")
      template(#prepend)
        b-icon.my-auto.mr-2(icon="alarm-fill" font-scale="2.25" variant="secondary")
        span.my-auto 通知開關
      b-checkbox.ml-2.my-auto(v-model="notification.announcement" disabled readonly title="全所、部門公告通知") 公告
      b-checkbox.ml-2.my-auto(v-model="notification.personal" title="個人通知") 個人
      b-checkbox.ml-2.my-auto(v-model="notification.chat") 聊天室

  
  fieldset
    legend 伺服器設定
    b-input-group.my-2(v-b-tooltip="'Websocket伺服器'")
      template(#prepend)
        b-icon.my-auto.mr-2(icon="chat" font-scale="2.25" variant="primary")
        span.my-auto 交談主機
      b-input.ml-2(v-model="wsHost" :state="validHost" trim)
      span.my-auto.mx-1 :
      b-input(v-model="wsPort" type="number" min="1025" max="65535" :state="validPort" style="max-width: 100px;")

    b-input-group.my-2(v-b-tooltip="'API伺服器'")
      template(#prepend)
        b-icon.my-auto.mr-2(icon="hdd-network" font-scale="2.25" variant="info")
        span.my-auto 查詢主機
      b-input.ml-2(v-model="wsHost" :state="validHost" trim readonly)
      span.my-auto.mx-1 :
      b-input(v-model="apiPortSetting" type="number" min="80" max="65535" :state="validApiPort" style="max-width: 100px;")

    b-input-group.my-2(v-b-tooltip="'地政智慧管控伺服器'")
      template(#prepend)
        b-icon.my-auto.mr-2(icon="server" font-scale="2.25" variant="success")
        span.my-auto 前端主機
      b-input.ml-2(v-model="wsHost" :state="validHost" trim readonly)
      span.my-auto.mx-1 :
      b-input(v-model="fePortSetting" type="number" min="80" max="65535" :state="validApiPort" style="max-width: 100px;")

    b-input-group.my-2
      template(#prepend)
        b-icon.my-auto.mr-2(icon="badge-ad-fill" font-scale="2.25" variant="dark")
        span.my-auto ＡＤ主機
      b-input.ml-2(v-model="adHost" placeholder="... AD伺服器IP ..." :state="validAdHost" trim)

  copyright
  status
</template>

<script>
import trim from 'lodash/trim'

export default {
  transition: 'list',
  head: {
    title: `桃園即時通-設定`
  },
  fetch () {
    this.restore()
  },
  data: () => ({
    adHost: '',
    wsHost: undefined,
    wsPort: 8081,
    apiPortSetting: 80,
    fePortSetting: 8080,
    adName: '',
    adPassword: '',
    adPasswordType: 'password',
    adPasswordIcon: 'eye-slash',
    historyCount: 10,
    notification: {
      announcement: true,
      personal: true,
      chat: false
    },
    fixNotify: true,
    department: 'adm',
    departmentOpts: [
      { value: '', text: '請選擇部門' },
      { value: 'reg', text: '登記課' },
      { value: 'inf', text: '資訊課' },
      { value: 'adm', text: '行政課' },
      { value: 'sur', text: '測量課' },
      { value: 'val', text: '地價課' },
      { value: 'hr', text: '人事室' },
      { value: 'acc', text: '會計室' },
      { value: 'supervisor', text: '主任秘書室' },
    ],
    effectVal: '',
    effectOpts: [
      { value: '', text: '無效果' },
      { value: 'bounce', text: '跳動' },
      { value: 'flash', text: '閃爍' },
      { value: 'headShake', text: '抖動' },
      { value: 'pulse', text: '呼吸' }
    ]
  }),
  computed: {
    // load user authority from API server, but need to wait apiQueryUrl updated in the mounted method
    userQueryStr() {
      return `${this.apiQueryUrl}${this.$consts.API.JSON.USER}`;
    },
    isAdmin() {
      return this.authority.isAdmin
    },
    departmentName() {
      const found = this.departmentOpts.find((item) => {
        return item.value === this.department;
      })
      return found?.text;
    },
    apiDepartmentName() {
      return this.apiUserinfo?.unit
    },
    deptNotSync() {
      return !this.$utils.empty(this.apiDepartmentName) && this.apiDepartmentName !== this.departmentName
    },
    wsConnStr() {
      return `ws://${this.wsHost}:${this.wsPort}`
    },
    validAdInfo() { return !this.empty(this.adPassword) && this.$utils.isIPv4(this.adHost) },
    validAdHost() { return this.$utils.isIPv4(this.adHost) === false ? false : null },
    validHost() { return this.$utils.isIPv4(this.wsHost) === false ? false : null },
    validPort() {
      const i = parseInt(trim(this.wsPort))
      return (i > 1024 && i < 65536) === false ? false : null
    },
    validApiPort() {
      const i = parseInt(trim(this.apiPortSetting))
      return (i > 79 && i < 65536) === false ? false : null
    },
    validFePort() {
      const i = parseInt(trim(this.fePortSetting))
      return (i > 1024 && i < 65536) === false ? false : null
    },
    validAdName() { return !this.$utils.empty(trim(this.adName)) },
    validDepartment() { return this.$utils.empty(trim(this.department)) === true ? false : null },
    validInformation() { return !this.$utils.empty(this.userid) && this.validAdName && this.validDepartment === null && this.validPort === null && this.validHost === null },

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
    wsPort(val) {
      this.$localForage.setItem('wsPort', val)
    },
    wsHost(val) {
      this.$localForage.setItem('wsHost', val)
      this.$store.commit('apiHost', val)
    },
    apiPortSetting(val) {
      this.$localForage.setItem('apiPort', val)
      this.$store.commit('apiPort', val)
    },
    fePortSetting(val) {
      this.$localForage.setItem('fePort', val)
      this.$store.commit('fePort', val)
    },
    adName(val) {
      this.$store.commit('username', val)
      this.$localForage.setItem('adName', val)
    },
    department(val) {
      this.$localForage.setItem('department', val)
      // update local userinfo cache
      this.$store.commit('userdept', val)
      if (!this.$utils.empty(val)) {
        this.$store.commit('apiUserinfo', { unit: this.departmentName })
        this.setCache("apiUserinfo", this.apiUserinfo, this.userDataCacheDuration)
        // sync to API server
        const { ipcRenderer } = require("electron")
        ipcRenderer.invoke("change-user-dept", {
          api: `${this.apiQueryUrl}${this.$consts.API.JSON.USER}`,
          type: "upd_dept",
          id: this.userid,
          dept: this.departmentName
        })
      }
    },
    effectVal(val) {
      this.$store.commit('effect', val)
      this.$localForage.setItem('effect', val)
    },
    historyCount (val) {
      this.$store.commit('history', val)
      this.$localForage.setItem('history', val)
    },
    'notification.announcement' (val) {
      const obj = { ...this.notification, announcement: val }
      this.$store.commit('notifySettings', obj)
      this.$localForage.setItem('notifySettings', obj)
    },
    'notification.personal' (val) {
      const obj = { ...this.notification, personal: val }
      this.$store.commit('notifySettings', obj)
      this.$localForage.setItem('notifySettings', obj)
    },
    'notification.chat' (val) {
      const obj = { ...this.notification, chat: val }
      this.$store.commit('notifySettings', obj)
      this.$localForage.setItem('notifySettings', obj)
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
    async restore() {
      // restore last settings
      this.adName = await this.$localForage.getItem('adName')
      this.department = await this.$localForage.getItem('department')
      this.adHost = await this.$localForage.getItem('adHost')
      this.adPassword = await this.$localForage.getItem('adPassword')
      this.wsHost = await this.$localForage.getItem('wsHost') || this.defaultSvrIp
      this.wsPort = await this.$localForage.getItem('wsPort') || 8081
      this.effectVal = await this.$localForage.getItem('effect') || 'headShake'
      this.historyCount = await this.$localForage.getItem('history') || 10
      this.apiPortSetting = await this.$localForage.getItem('apiPort') || 80
      this.fePortSetting = await this.$localForage.getItem('fePort') || 8080
      this.notification = { ...this.notifySettings, ...await this.$localForage.getItem('notifySettings') }
    },
    logout() {
      this.confirm(`確認登出清除所有設定？`).then((answer) => {
        if (answer) {
          this.$localForage.clear()
          // set default department
          this.department = 'adm'
          this.$router.push('/home?reconnect=true')
        }
      })
    },
    quit () {
      this.confirm(`確定關閉程式？`).then((answer) => {
        if (answer) {
          // ipc to electron main process
          const { ipcRenderer } = require('electron')
          ipcRenderer.invoke('quit')
        }
      })
    },
    queryAd () {
      this.isBusy = true
      const sAMAccountName = `${this.userid}@${this.domain}`
      const { ipcRenderer } = require('electron')
      ipcRenderer.invoke('ad-user-query', {
        url: `ldap://${this.adHost}`,
        baseDN: `DC=${this.domain.split('.').join(',DC=')}`, // 'DC=HB,DC=CENWEB,DC=LAND,DC=MOI'
        username: sAMAccountName,
        password: this.adPassword
      }).then((result) => {
        const group = result.group
        const desc = result.description
        this.log(this.time(), `查到 ${sAMAccountName} 描述`, desc)
        this.log(this.time(), `查到 ${sAMAccountName} 部門`, group)
        const name = desc || this.userMap[this.userid] || this.userid
        this.$store.commit('username', name)
        this.$localForage.setItem('adName', name)
        this.adName = name
        this.department = group
        this.connectText = `AD: ${this.userid} ${name} ${group}`
        this.notify(`已查到 ${this.userid} 姓名為 ${name} 部門 ${group}`, { type: 'info' })
      }).catch((err) => {
        console.error(err)
        this.alert(`AD查詢失敗，密碼錯誤!?`, { title: `ldap://${this.adHost}`, subtitle: sAMAccountName })
      }).finally(() =>{
        this.log(this.time(), `透過AD查詢使用者中文姓名結束`)
        this.isBusy = false
      })
    }
  },
  created () {
    this.restore()
  },
  mounted () {
    this.clearReconnectTimer()
    this.setCurrentChannel('chat')
  },
  beforeDestroy () {
    this.closeWebsocket()
  }
}
</script>

<style lang="scss" scoped>
fieldset {
	border:0;
	padding:10px;
	padding-top:30px;
  margin: 25px 10px 35px 10px;
  background:rgb(255, 255, 255);

	border-radius: 15px;
	-moz-border-radius: 15px;
	-webkit-border-radius: 15px;

	box-shadow:3px 3px 10px #666;
	-moz-box-shadow:3px 3px 10px #666;
	-webkit-box-shadow:3px 3px 10px #666;

  position:relative;
}

legend {
	padding:5px 10px;
	background-color:#ffffff;
	color:rgb(70, 66, 66);

	border-radius:15px;
	-moz-border-radius:15px;
	-webkit-border-radius:15px;

	box-shadow:2px 2px 4px #666;
	-moz-box-shadow:2px 2px 4px #666;
	-webkit-box-shadow:2px 2px 4px #666;

	position:absolute;
	left:15px;
  top:-20px;
  width: auto;
  font-size: 1.25rem;
}

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

.eye {
  cursor: pointer;
  position: absolute;
  right: 4.55rem;
  top: .55rem;
  z-index: 1001;
}

.gradient-top {
  background: rgb(255,255,255);
  background: linear-gradient(0deg, rgba(255,255,255,1) 90%, rgba(201,204,196,1) 100%);
}
</style>
