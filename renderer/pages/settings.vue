<template lang="pug">
  div(v-cloak): .w-75
    .center.d-flex.my-2
      b-input-group
        template(#prepend): b-icon.my-auto.mr-2(icon="person-badge" font-scale="2.25" variant="secondary")
        b-input(v-model="nickname" placeholder="... 顯示姓名 ..." trim :state="validNickname")
      b-input-group.ml-1
        template(#prepend): b-icon.my-auto.mr-2(icon="building" font-scale="2.25" variant="secondary")
        b-select(v-model="department" :options="departmentOpts" :state="validDepartment")

    b-input-group.my-2
      template(#prepend): b-icon.my-auto.mr-2(icon="server" font-scale="2.25" variant="secondary")
      b-input(v-model="wsHost" @keyup.enter.exact="manualConnect" :state="validHost" trim)
      span.my-auto.mx-1 :
      b-input.mr-1(v-model="wsPort" type="number" min="1025" max="65535" :state="validPort" style="max-width: 75px;")
    
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
    currentChannel(nVal, oVal) {
      this.$config.isDev && console.log(`離開 ${oVal} 頻道，進入 ${nVal} 頻道`)
      this.delaySendChannelActivity(oVal, nVal)

      if (!(nVal in this.messages)) {
        this.$store.commit("addChannel", nVal || this.userid)
        this.$config.isDev && console.log(this.time(), `add channel ${nVal} to $store!`)
        this.$store.commit("resetUnread", nVal || this.userid)
        this.$config.isDev && console.log(this.time(), `add unread ${nVal} to $store!`)
      }
      // release from channel items
      this.messages[oVal] && (this.messages[oVal].length = 0)
      this.latestMessage()
    },
    wsHost(val) {
      this.resetReconnectTimer()
      this.$localForage.setItem('wsHost', val)
    },
    wsPort(val) {
      this.resetReconnectTimer()
      this.$localForage.setItem('wsPort', val)
    },
    nickname(val) {
      this.resetReconnectTimer()
      this.$store.commit('username', val)
      this.$localForage.setItem('nickname', val)
    },
    department(val) {
      this.resetReconnectTimer()
      this.$store.commit('userdept', val)
      this.$localForage.setItem('department', val)
    }
  },
  methods: {
    delaySendChannelActivity: function noop () {},
    sendChannelActivity(oVal, nVal) {
      if (this.connected) {
        this.$config.isDev && console.log(`準備送出 ${oVal} / ${nVal} 活動訊息`)
        // delaySendChannelActivity will debounce 5000ms then checking if it need to send the message 
        const oCName = this.getChannelName(oVal)
        const nCName = this.getChannelName(nVal)
        !this.stickyChannels.includes(oVal) && this.currentChannel !== oVal && this.sendTo(`${this.username || this.userid} 離開 ${oCName} 頻道`, { sender: 'system', channel: oVal })
        !this.stickyChannels.includes(nVal) && this.currentChannel === nVal && this.sendTo(`${this.username || this.userid} 進入 ${nCName} 頻道`, { sender: 'system', channel: nVal })
      }
    },
    sendAppCloseActivity() {
      const cName = this.getChannelName(this.currentChannel)
      !this.stickyChannels.includes(this.currentChannel) && this.sendTo(`${this.username || this.userid} 離開 ${cName} 頻道 (程式已關閉)`, { sender: 'system', channel: this.currentChannel })
    },
    send () {
      // detect local commands
      const text = trim(this.text)
      if (text === '@clearCache') {
        this.$localForage.clear().then((params) => {
          this.notify(`本機記憶資料已清除`, { type: 'success' })
        })
      } else if (text === '@settings') {
        this.$router.push('/settings')
      }

      if (this.sendTo(this.text, { channel: this.currentChannel })) {
        this.text = ''
      }
    },
    sendTo(message, opts = {}) {
      message = trim(message)
      !this.connected && this.connect()
      if (!isEmpty(message)) {
        if (this.connected) {
          const jsonStr = this.packMessage(message, { channel: this.currentChannel, ...opts })
          this.websocket.send(jsonStr)
          return true
        } else {
          this.notify(`伺服器連線${this.status(
            this.websocket.readyState
          )} ... 無法傳送訊息`, { type: 'warning', pos: 'tf' })
        }
      }
      return false
    },
    status(code) {
      switch (code) {
        case 0:
          return "連線中"
        case 1:
          return "已連線"
        case 2:
          return "關閉中"
        case 3:
          return "已關閉"
        default:
          return `未定義的代碼(${code})`
      }
    },
    register() {
      if (this.connected) {
        const jsonString = JSON.stringify({
          type: "command",
          sender: this.userid,
          date: this.date(),
          time: this.time(),
          message: JSON.stringify({
            command: 'register',
            ip: this.ip,
            domain: this.domain,
            userid: this.userid,
            username: this.nickname,
            dept: this.department,
          }),
          channel: 'system'
        })
        this.websocket.send(jsonString)
      } else {
        this.$config.isDev && console.log(
          this.time(),
          "尚未連線無法登錄客戶端資料", {
            ip: this.ip,
            domain: process.env["USERDOMAIN"],
            userid: this.userid,
            username: this.$config.username,
            dept: this.$config.userdept,
          }
        )
      }
    },
    queryMyChannel () {
      const jsonString = JSON.stringify({
        type: "command",
        sender: this.userid,
        date: this.date(),
        time: this.time(),
        message: JSON.stringify({ command: 'mychannel' }),
        channel: 'system'
      })
      this.websocket.send(jsonString)
    },
    handleAckMessage (json) {
      const cmd = json.command
      this.$config.isDev && console.log(this.time(), `處理系統 ACK 訊息 ${cmd} [home::handleAckMessage]`, json)
      switch (cmd) {
        case 'register':
          json.success && this.queryMyChannel()
          break;
        case 'mychannel':
          if (json.success) {
            const payload = json.payload
            switch (payload.action) {
              case 'add':
                this.addChatChannel(payload)
                break;
              case 'remove':
                this.removeChatChannel(payload)
                break;
              default:
                console.warn(`不支援的 mychannel ACK 動作 ${payload.action}`)
            }
          }
          break;
        case 'remove_channel':
          const item = json.payload
          json.success && this.$store.commit('removeParticipatedChannel', item)
          this.notify(`${json.message}`, { type: json.success ? 'success' : 'warning' })
          break;
        default:
          console.warn(`收到未支援指令 ${cmd} ACK`, json)
      }
    },
    addChatChannel(payload) {
      this.$store.commit('addParticipatedChannel', {
        id: payload.id,
        name: payload.name,
        participants: payload.participants,
        type: payload.type // 0 => 1-1, 1 => group, 2 => dept
      })
    },
    removeChatChannel(payload) {
      this.$store.commit('removeParticipatedChannel', {
        id: payload.id,
        name: payload.name,
        participants: payload.participants,
        type: payload.type
      })
    },
    handleSystemMessage (json) {
      const action = json.action
      this.$config.isDev && console.log(this.time(), `處理系統訊息 ${action} [home::handleSystemMessage]`, json)
      switch (action) {
        default:
          this.$config.isDev && console.log(this.time(), `未支援的命令 ${action}`, json)
      }
      
    },
    manualConnect() {
      this.connecting = true
      this.resetReconnectTimer()
      this.delayConnect()
    }, 
    connect() {
      if (this.connected) {
        this.$config.isDev && console.log(this.time(), "已連線，略過檢查")
      } else {
        if (this.validInformation) {
          this.connecting = true
          try {
            this.websocket && this.websocket.close()
            this.connectText = '連線中'
            const ws = new WebSocket(this.wsConnStr)
            ws.onopen = (e) => {
              // ws to Vuex store
              this.$store.commit('websocket', ws)
              this.$config.isDev && console.log(this.time(), "已連線", e)
              // set client info to remote ws server
              this.register()

              // query current channel latest messages
              this.list.length = 0
              this.delayLatestMessage()

              this.connectText = '已上線'
              this.connecting = false
            }
            ws.onclose = (e) => {
              this.$store.commit('websocket', undefined)
              this.$config.isDev && console.warn(this.time(), "WS伺服器連線已關閉", e)
              this.connecting = false
              this.connectText = `等待重新連線中(${this.wsConnStr})`
              // this.notify('無法傳送訊息', { type: 'danger', pos: 'bf', subtitle: this.wsConnStr })
            }
            ws.onerror = (e) => {
              this.$store.commit('websocket', undefined)
              this.$config.isDev && console.warn(this.time(), "WS伺服器連線出錯", e)
              this.connectText = `'WS伺服器連線出錯'`
              this.connecting = false
              // this.notify(`連線有問題`, { type: 'dark', pos: 'bf', subtitle: this.wsConnStr })
            }
            ws.onmessage = (e) => {
              const incoming = JSON.parse(e.data)
              const channel = incoming['channel']

              this.$config.isDev && console.log(this.time(), `現在 ${this.currentChannel} 頻道收到 ${channel} 頻道的 #${incoming['id']} 資料`, incoming)

              if (incoming.type === 'ack') {
                this.handleAckMessage(incoming.message)
              } else if (channel === 'system') {
                // got system message
                this.handleSystemMessage(incoming.message)
              } else if (this.currentChannel == channel) {
                !Array.isArray(this.messages[channel]) && this.$store.commit("addChannel", channel)
                this.$nextTick(() => {
                  // add message to store channel list
                  !isEmpty(incoming['message']) && this.messages[channel].push(incoming)
                })
              } else if (incoming.message && incoming.sender !== 'system') {
                if (parseInt(this.unread[channel]) === NaN) {
                  this.$store.dispatch("resetUnread", channel)
                }
                this.$store.dispatch("plusUnread", channel)
              }
              
              this.connecting = false
            }
          } catch (e) {
            this.connectText = '連線錯誤'
            console.error(e)
            this.websocket.close()
            this.$store.commit('websocket', undefined)
          } finally {
          }
        } else {
          this.notify('請輸入正確的連線資訊', { type: 'warning', pos: 'tf' })
        }
      }
    },
    delayConnect () { /* placeholder */ },
    delayLatestMessage () { /* placeholder */ },
    latestMessage() {
      if (this.connected) {
        const jsonString = JSON.stringify({
          type: "command",
          sender: this.userid,
          date: this.date(),
          time: this.time(),
          message: JSON.stringify({
            command: 'latest',
            channel: this.currentChannel,
            count: 30
          }),
          channel: 'system'
        })
        this.websocket.send(jsonString)
      } else {
        this.$config.isDev && console.log(
          this.time(),
          `尚未連線無法取得 ${this.currentChannel} 最新訊息資料`
        )
      }
    },
    setCurrentChannel (channel) {
      this.$store.commit('currentChannel', channel)
      // switch to new channel reset the unread number
      this.$store.commit("resetUnread", channel)
    },
    showUnread (channel) {
      return this.getUnread(channel) > 0 || this.getUnread(channel) === '99+'
    },
    getUnread (channel) {
      if (this.unread) {
         return this.unread[channel] || 0
      }
      return 0
    },
    resetReconnectTimer () {
      // reset timer if it already settled
      if (this.timer !== null) {
        this.$config.isDev && console.log(this.time(), "清除重新連線檢查定時器")
        clearInterval(this.timer)
        this.$store.commit('timer', null)
      }
      // check connection every 20s
      if (this.timer === null) {
        this.$config.isDev && console.log(this.time(), "啟動重新連線檢查定時器")
        this.$store.commit('timer', setInterval(() => {
          this.$config.isDev && console.log(this.time(), "開始檢查連線狀態 ... ")
          this.connectText = '開始檢查連線狀態'
          this.connect()
        }, 20000))
      }
    },
    ipcRendererSetup () {
      // dynamic get userinfo from main process
      const { ipcRenderer } = require('electron')
      ipcRenderer.invoke('userinfo').then((userinfo) => {
        this.$store.commit('userinfo', userinfo)
        this.$store.commit('currentChannel', this.userid)
        this.register()
      })
      // receive main process quit event
      ipcRenderer.on('quit', (event, args) => this.sendAppCloseActivity())
    }
  },
  created() {
    if (!(this.currentChannel in this.messages) && !this.$isServer) {
      this.$store.commit("addChannel", this.currentChannel)
      this.$config.isDev && console.log(this.time(), `add channel ${this.currentChannel} to $store! [messageMixin::created]`)
      this.$store.commit("resetUnread", this.currentChannel)
      this.$config.isDev && console.log(this.time(), `add unread ${this.currentChannel} to $store! [messageMixin::created]`)
    }
    this.delayConnect = debounce(this.connect, 1500)
    this.delayLatestMessage = debounce(this.latestMessage, 400)
    this.delaySendChannelActivity = debounce(this.sendChannelActivity, 0.5 * 1000)
  },
  async mounted () {
    this.ipcRendererSetup()
    this.$store.commit("resetUnread", this.userid)
    // auto connect to ws server, delay 40s
    setTimeout(this.resetReconnectTimer, 40 * 1000)

    // restore last settings
    this.nickname = await this.$localForage.getItem('nickname')
    this.department = await this.$localForage.getItem('department')
    this.wsHost = await this.$localForage.getItem('wsHost')
    this.wsPort = await this.$localForage.getItem('wsPort')

    // const { BrowserWindow } = require('electron').remote
    // const win = new BrowserWindow({ width: 800, height: 600 })
    // win.loadURL('https://github.com')
    // move scroll bar to the bottom
    // this.$nextTick(() => {
    //   if (this.$refs.box) {
    //     this.$refs.box.scrollTop = this.$refs.box.scrollHeight
    //   }
    // })

    // testing
    // console.log(this.$config, Electron, this.estore, this.messages)
    // this.estore.set({
    //   pyliu: 'awesome'
    // })
    
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
