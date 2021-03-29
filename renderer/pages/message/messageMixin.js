
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
        console.log(`add channel ${val} to $store!`)
      }
    },
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
      if (!this.connected) {
        this.list.push(JSON.parse(this.packMessage(`連線中 ...`)))
        const ws = new WebSocket(this.wsConnStr)
        ws.onopen = (e) => {
          // set client info to remote ws server
          this.register()
          this.list.length = 0
        }
        ws.onclose = (e) => {
          this.list.push(
            JSON.parse(this.packMessage(`WS伺服器連線已關閉，無法進行通訊`))
          )
        }
        ws.onerror = () => {
          this.list.push(
            JSON.parse(
              this.packMessage(`WS伺服器連線出錯【${this.wsConnStr}】`)
            )
          )
        }
        ws.onmessage = (e) => {
          const incoming = JSON.parse(e.data)
          const channel = incoming['channel'] || process.env['USERNAME'] || 'mine'
          console.log(`收到的 ${channel} 頻道的資料`, incoming)
          
          if (!(channel in this.messages)) {
            this.$store.commit("addChannel", channel)
            console.log(`add channel ${channel} to $store!`)
          }
          // add message to store channel list
          this.messages[channel].push({ ...incoming })
        }
        // ws to Vuex store
        this.$store.commit('websocket', ws)
      }
    },
  },
  created() {
    if (!(this.channel in this.messages) && !this.$isServer) {
      this.$store.commit("addChannel", this.channel)
      console.log(`add channel ${this.channel} to $store!`)
    }
  },
}
