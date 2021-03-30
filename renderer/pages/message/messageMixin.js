
import trim from 'lodash/trim'
import isEmpty from 'lodash/isEmpty'
export default {
  name: "messageMixin",
  fetchOnServer: false,
  computed: {
    wsConnStr() {
      return `ws://${this.$config.websocketHost}:${this.$config.websocketPort}`
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
    channel() {
      return this.$route.params.id || process.env['USERNAME'] || 'mine'
    },
    list() {
      return this.messages[this.channel]
    },
  },
  watch: {
    channel(val) {
      if (!(val in this.messages)) {
        this.$store.commit("addChannel", val || process.env['USERNAME'] || 'mine')
        this.$config.isDev && console.log(this.time(), `add channel ${val} to $store!`)
      }
    }
  },
  methods: {
    date() {
      const now = new Date()
      return (
        now.getFullYear() +
        "-" +
        ("0" + (now.getMonth() + 1)).slice(-2) +
        "-" +
        ("0" + now.getDate()).slice(-2)
      )
    },
    time() {
      const now = new Date()
      const time =
        ("0" + now.getHours()).slice(-2) +
        ":" +
        ("0" + now.getMinutes()).slice(-2) +
        ":" +
        ("0" + now.getSeconds()).slice(-2)
      return time
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
          sender: "信差客戶端",
          date: this.date(),
          time: this.time(),
          message: JSON.stringify({
            ip: this.ip,
            domain: process.env["USERDOMAIN"],
            userid: process.env["USERNAME"],
            username: this.$config.username,
            dept: this.$config.userdept,
          }),
        })
        this.websocket.send(jsonString)
      } else {
        this.$config.isDev && console.log(
          this.time(),
          "尚未連線無法登錄客戶端資料", {
            ip: this.ip,
            domain: process.env["USERDOMAIN"],
            userid: process.env["USERNAME"],
            username: this.$config.username,
            dept: this.$config.userdept,
          }
        )
      }
    },
    packMessage(text, opts = {}) {
      return JSON.stringify({
        ...{
          type: "mine",
          sender: process.env["USERNAME"],
          date: this.date(),
          time: this.time(),
          title: "dontcare",
          from: this.ip,
          message: text,
          channel: this.channel,
        },
        ...opts,
      })
    },
    sendTo(message, channel) {
      !this.connected && this.connect()
      if (!isEmpty(message)) {
        if (this.connected) {
          const jsonStr = this.packMessage(trim(message), { channel: channel })
          this.websocket.send(jsonStr)
          return true
        } else {
          this.list.push(
            JSON.parse(
              this.packMessage(
                `伺服器連線${this.status(
                  this.websocket.readyState
                )} ... 無法傳送訊息`
              )
            )
          )
        }
      }
      return false
    },
    connect() {
      if (this.connected) {
        this.$config.isDev && console.log(this.time(), "已連線，略過檢查")
      } else {
        const ws = new WebSocket(this.wsConnStr)
        ws.onopen = (e) => {
          // ws to Vuex store
          this.$store.commit('websocket', ws)
          this.$config.isDev && console.log(this.time(), "已連線", e)
          // set client info to remote ws server
          this.register()
          this.list.length = 0
          // TODO: get this channel top 30 messages
        }
        ws.onclose = (e) => {
          this.list.push( JSON.parse(this.packMessage(`WS伺服器連線已關閉，無法進行通訊`)) )
          this.$store.commit('websocket', undefined)
          this.$config.isDev && console.warn(this.time(), "WS伺服器連線已關閉", e)
        }
        ws.onerror = (e) => {
          this.list.push( JSON.parse(this.packMessage(`WS伺服器連線出錯【${this.wsConnStr}】`)) )
          this.$store.commit('websocket', undefined)
          this.$config.isDev && console.error(this.time(), "WS伺服器連線出錯", this.wsConnStr, e)
        }
        ws.onmessage = (e) => {
          const incoming = JSON.parse(e.data)
          const channel = incoming['channel'] || process.env['USERNAME'] || 'mine'
          this.$config.isDev && console.log(this.time(), `收到的 ${channel} 頻道的資料 [messageMixin::ws.onmessage]`, incoming)
          
          if (Array.isArray(this.messages[channel])) {
            // add message to store channel list
            this.messages[channel].push({ ...incoming })
          } else {
            this.$store.commit("addChannel", channel)
            this.$config.isDev && console.log(this.time(), `新增 ${channel} 頻道到Vuex Store。 [messageMixin::ws.onmessage]`)
            setTimeout(() => {
              this.messages[channel].push({ ...incoming })
            }, 100)
          }
        }
      }
    },
  },
  created() {
    if (!(this.channel in this.messages) && !this.$isServer) {
      this.$store.commit("addChannel", this.channel)
      this.$config.isDev && console.log(this.time(), `add channel ${this.channel} to $store! [messageMixin::created]`)
    }
  },
  mounted() {
    // reset timer if it already settle
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
  }
}
