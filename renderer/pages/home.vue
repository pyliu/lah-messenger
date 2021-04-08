<template lang="pug">
  div(v-cloak)
    transition(v-if="connected" name="list"): div
      b-card.m-1(no-body header-tag="nav")
        template(#header): client-only: b-nav(card-header tabs fill)
          b-nav-item(:active="isAnnouncement"): a.mr-1(@click="setCurrentChannel('announcement')")
            b-icon.mr-1(icon="bookmarks")
            span 公告
            b-badge.ml-1(variant="danger" pill v-if="showUnread('announcement')") {{ getUnread('announcement') }}
          b-nav-item(:active="isPersonal"): a.mr-1(@click="setCurrentChannel(userid)" title="進入個人通知列表")
            b-icon.mr-1(icon="person")
            span 個人通知
            b-badge.ml-1(variant="success" pill v-if="showUnread(userid)") {{ getUnread(userid) }}
          b-nav-item(:active="isChat"): a.mr-1(@click="setCurrentChannel('chat')" title="進入會話選單")
            b-icon.mr-1(icon="chat-text")
            span 交談頻道

        transition(name="list" mode="out-in"): b-list-group.my-1(v-if="inChatting" flush): b-list-group-item: b-link.d-flex.justify-content-start.align-items-center(@click="setCurrentChannel('chat')")
          b-icon.mr-1(icon="arrow-left-circle-fill" font-scale="1.25" title="返回列表")
          span {{ getChannelName(currentChannel) }} 

        transition(name="list" mode="out-in"): chat-board(v-if="showChatBoard")
        transition(name="list" mode="out-in"): message-board(v-if="showMessageBoard" :list="list")
        
      transition(name="listY" mode="out-in"): b-input-group.p-1.mt-n1(v-if="showInputGroup" size="sm")
        b-textarea.mr-1(
          v-model="text"
          debounce="200"
          placeholder="... Ctrl + Enter 直接送出 ..."
          @keyup.ctrl.enter="send"
          @keydown="delayConnect"
          no-resize
          no-auto-shrink
          autofocus
        )
        b-button(@click="send" :variant="valid ? 'primary' : 'outline-primary'" :disabled="!valid")
          b-icon(icon="cursor" v-if="valid")
          span 傳送
    .center.vh-100(v-else @click="delayConnect")
      div
        h5.d-flex.justify-content-center {{ userid }} from {{ ip }}
        h5.d-flex.justify-content-center
          b-icon.mr-1(icon="info-circle-fill" animation="fade" variant="info" font-scale="1.5")
          .my-auto {{ connectText }} #[b-icon(icon="three-dots" /*animation="cylon"*/)] 
        b-input-group(prepend="伺服器")
          b-input(v-model="wsHost" @keyup.enter.exact="manualConnect")
          span.my-auto.mx-1 :
          b-input.mr-1(v-model="wsPort" type="number" min="1025" max="65535" style="max-width: 75px;")
          b-button(@click="manualConnect" variant="outline-primary" :disabled="connecting")
            b-icon(icon="arrow-clockwise" animation="spin-pulse" v-if="connecting")
            span(v-else) 連線
</template>

<script>
import trim from 'lodash/trim'
import isEmpty from 'lodash/isEmpty'
import debounce from 'lodash/debounce'

export default {
  head: {
    title: `桃園地政事務所`
  },
  asyncData ({ req, store, redirect, error }) {
    return {
      name: process.static ? 'static' : (process.server ? 'server' : 'client')
    }
  },
  data: () => ({
    text: '',
    connectText: '連線中',
    wsHost: '127.0.0.1',
    wsPort: 8081,
    connecting: false
  }),
  computed: {
    showInputGroup () { return !this.isAnnouncement && (this.currentChannel === this.userid || this.currentChannel !== 'chat') },
    showMessageBoard () { return this.currentChannel !== 'chat' },
    showChatBoard () { return this.isChat },

    isChat () { return !this.isAnnouncement && !this.isPersonal },
    isPersonal () { return this.userid === this.currentChannel },
    isAnnouncement () { return this.currentChannel === 'announcement' },
    isInf () { return this.currentChannel === 'inf' },
    isAdm () { return this.currentChannel === 'adm' },
    isVal () { return this.currentChannel === 'val' },
    isReg () { return this.currentChannel === 'reg' },
    isSur () { return this.currentChannel === 'sur' },
    isAcc () { return this.currentChannel === 'acc' },
    isHr () { return this.currentChannel === 'hr' },
    isSupervisor () { return this.currentChannel === 'supervisor' },
    isLds () { return this.currentChannel === 'lds' },
    
    belongToInf () { return this.userdept === 'inf' },
    belongToAdm () { return this.userdept === 'adm' },
    belongToVal () { return this.userdept === 'val' },
    belongToReg () { return this.userdept === 'reg' },
    belongToSur () { return this.userdept === 'sur' },
    belongToAcc () { return this.userdept === 'acc' },
    belongToHr () { return this.userdept === 'hr' },
    belongToSupervisor () { return this.userdept === 'supervisor' },

    wsConnStr() {
      return `ws://${this.wsHost}:${this.wsPort}`
    },
    connected() {
      /**
       * readyState attr
       * CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3
       */
      return this.websocket && this.websocket.readyState === 1
    },
    disconnected() {
      return isEmpty(this.websocket) || this.websocket.readyState === 3
    },
    valid() { return !isEmpty(trim(this.text)) },
    list() {
      return this.messages[this.currentChannel]
    },

    stickyChannels() { return ['announcement', this.userid, 'chat'] },
    inChatting() { return !this.stickyChannels.includes(this.currentChannel) }

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
      this.messages[oVal].length = 0
      this.latestMessage()
    },
    wsHost(val) {
      this.resetReconnectTimer()
    },
    wsPort(val) {
      this.resetReconnectTimer()
    }
  },
  methods: {
    delaySendChannelActivity: function noop () {},
    sendChannelActivity(oVal, nVal) {
      this.$config.isDev && console.log(`準備送出 ${oVal} / ${nVal} 活動訊息`)
      // delaySendChannelActivity will debounce 5000ms then checking if it need to send the message 
      const oCName = this.getChannelName(oVal)
      const nCName = this.getChannelName(nVal)
      !this.stickyChannels.includes(oVal) && this.currentChannel !== oVal && this.sendTo(`${this.username || this.userid} 離開 ${oCName} 頻道`, { sender: 'system', channel: oVal })
      !this.stickyChannels.includes(nVal) && this.currentChannel === nVal && this.sendTo(`${this.username || this.userid} 進入 ${nCName} 頻道`, { sender: 'system', channel: nVal })
    },
    sendAppCloseActivity() {
      const cName = this.getChannelName(this.currentChannel)
      !this.stickyChannels.includes(this.currentChannel) && this.sendTo(`${this.username || this.userid} 離開 ${cName} 頻道 (程式已關閉)`, { sender: 'system', channel: this.currentChannel })
    },
    send () {
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
          type: "register",
          sender: this.userid,
          date: this.date(),
          time: this.time(),
          message: JSON.stringify({
            ip: this.ip,
            domain: process.env["USERDOMAIN"],
            userid: this.userid,
            username: this.$config.username,
            dept: this.$config.userdept,
          }),
          channel: this.userid
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
    handleSystemMessage (json) {
      const action = json.action
      this.$config.isDev && console.log(this.time(), `處理系統訊息 ${action} [home::handleSystemMessage]`, json)
      switch (action) {
        case 'add_channel':
          this.$store.commit('addParticipatedChannel', {
            id: json.id,
            name: json.name,
            participants: json.participants,
            type: json.type // 0 => 1-1, 1 => group, 2 => dept
          })
          break
        case 'remove_channel':
          this.$store.commit('removeParticipatedChannel', {
            id: json.id,
            name: json.name,
            participants: json.participants,
            type: json.type
          })
          break
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
          }
          ws.onclose = (e) => {
            this.connectText = 'WS伺服器連線已關閉'
            this.$store.commit('websocket', undefined)
            this.$config.isDev && console.warn(this.time(), "WS伺服器連線已關閉", e)
            setTimeout(() => this.connectText = `等待重新連線中(${this.wsConnStr})`, 3000)
            // this.notify('無法傳送訊息', { type: 'danger', pos: 'bf', subtitle: this.wsConnStr })
          }
          ws.onerror = (e) => {
            this.$store.commit('websocket', undefined)
            this.$config.isDev && console.warn(this.time(), "WS伺服器連線出錯", e)
            this.connectText = 'WS伺服器連線出錯'
            // this.notify(`連線有問題`, { type: 'dark', pos: 'bf', subtitle: this.wsConnStr })
          }
          ws.onmessage = (e) => {
            const incoming = JSON.parse(e.data)
            const channel = incoming['channel'] || this.userid

            this.$config.isDev && console.log(this.time(), `目前頻道：${this.currentChannel} [home::ws.onmessage]`)
            this.$config.isDev && console.log(this.time(), `收到的 ${channel} 頻道的資料 [home::ws.onmessage]`)

            this.$config.isDev && console.log(this.time(), incoming)

            if (channel === 'system') {
              // got system message
              this.handleSystemMessage(incoming.message)
            } else if (this.currentChannel == channel) {
              if (!Array.isArray(this.messages[channel])) {
                this.$store.commit("addChannel", channel)
                this.$config.isDev && console.log(this.time(), `新增 ${channel} 頻道到 Vuex Store。 [messageMixin::ws.onmessage]`)
              }
              this.$nextTick(() => {
                this.$config.isDev && console.log(this.time(), `${channel} 頻道新訊息 #${incoming['id']}`, this.messages[channel])
                // add message to store channel list
                !isEmpty(incoming['message']) && this.messages[channel].push(incoming)
              })
            } else if (incoming.message && incoming.sender !== 'system') {
              if (parseInt(this.unread[channel]) === NaN) {
                this.$store.dispatch("resetUnread", channel)
              }
              this.$store.dispatch("plusUnread", channel)
            }
          }
        } catch (e) {
          console.error(e)
          this.$store.commit('websocket', undefined)
        } finally {
          this.connecting = false
        }
      }
    },
    delayConnect () { /* placeholder */ },
    delayLatestMessage () { /* placeholder */ },
    latestMessage() {
      if (this.connected) {
        const jsonString = JSON.stringify({
          type: "latest",
          sender: this.userid,
          date: this.date(),
          time: this.time(),
          message: { channel: this.currentChannel, count: 20 },
          channel: this.currentChannel
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
        clearTimeout(this.timer)
        this.$store.commit('timer', null)
      }
      // check connection every 20s
      if (this.timer === null) {
        this.$config.isDev && console.log(this.time(), "啟動重新連線檢查定時器")
        this.$store.commit('timer', setInterval(() => {
          this.$config.isDev && console.log(this.time(), "開始檢查連線狀態 ... ")
          this.connect()
        }, 20000))
      }
    },
    ipcRendererSetup () {
      // dynamic get userinfo from main process
      const { ipcRenderer } = require('electron')
      ipcRenderer.invoke('userinfo').then((userinfo) => {
        this.$store.commit('userid', userinfo.userid)
        this.$store.commit('currentChannel', userinfo.userid)
        this.$store.commit('ip', userinfo.ipv4)
        this.$store.commit('address', userinfo.address)
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
    this.wsHost = this.$config.websocketHost
    this.wsPort = this.$config.websocketPort
  },
  mounted () {
    this.ipcRendererSetup()
    this.$store.commit("resetUnread", this.userid)
    // auto connect to ws server
    this.resetReconnectTimer()

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
</style>
