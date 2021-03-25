<template lang="pug">
  .msg-container
    .msg(ref="box")
      message(v-for="(item, idx) in list" :raw="item" :key="idx")
    b-input-group(size="sm")
      b-textarea.mr-1(
        v-model="text"
        debounce="200"
        placeholder="... Ctrl + Enter 直接送出 ..."
        @keyup.ctrl.enter="send"
        no-resize
        no-auto-shrink
        autofocus
        trim
      )
      b-button(@click="send" variant="primary") 傳送
</template>

<script>
import Electron from 'electron'
import * as EStore from 'electron-store'
import isEmpty from 'lodash/isEmpty'
import message from '~/components/message.vue'

export default {
  components: { message },
  asyncData ({ req, store, redirect, error }) {
    const now = new Date()
    const time = ('0' + now.getHours()).slice(-2) + ':' +
                 ('0' + now.getMinutes()).slice(-2) + ':' +
                 ('0' + now.getSeconds()).slice(-2)
    return {
      name: process.static ? 'static' : (process.server ? 'server' : 'client')
    }
  },
  data: () => ({
    list: [],
    text: '',
    websocket: undefined,
    store: new EStore()
  }),
  computed: {
    ws () { return `ws://${this.$config.websocketHost}:${this.$config.websocketPort}` },
    htmlText () {
      return this.text.replace(new RegExp('\r?\n','g'), '<br />')
    }
  },
  methods: {
    date () {
      const now = new Date()
      return now.getFullYear() + '-' +
        ('0' + (now.getMonth() + 1)).slice(-2) + '-' +
        ('0' + now.getDate()).slice(-2)
    },
    time () {
      const now = new Date()
      const time = ('0' + now.getHours()).slice(-2) + ':' +
                   ('0' + now.getMinutes()).slice(-2) + ':' +
                   ('0' + now.getSeconds()).slice(-2)
      return time
    },
    packMessage (text, who = 'me') {
      return JSON.stringify({
        type: text.startsWith('@') ? text : 'mine',
        who: who,
        date: this.date(),
        time: this.time(),
        message: text
      })
    },
    status (code) {
      switch (code) {
        case 0:
          return '連線中'
        case 1:
          return '已連線'
        case 2:
          return '關閉中'
        case 3:
          return '已關閉'
        default:
          return `未定義的代碼(${code})`
      }
    },
    sendUserInfo () {
      if (this.websocket && this.websocket.readyState === 1) {
        const jsonString = JSON.stringify({
          type: 'user',
          who: '信差客戶端',
          date: this.date(),
          time: this.time(),
          message: JSON.stringify({
            ip: this.ip,
            domain: process.env['USERDOMAIN'],
            username: process.env['USERNAME']
          })
        })
        this.websocket.send(jsonString)
      }
    },
    send () {
      if (!isEmpty(this.text)) {
        /**
         * readyState attr
         * CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3
         */
        if (this.websocket && this.websocket.readyState !== 1) {
          this.list = [...this.list, JSON.parse(this.packMessage(`伺服器連線${this.status(this.websocket.readyState)} ...`)) ]
          this.websocket.readyState === 3 && this.connect()
        }
        
        if (this.websocket && this.websocket.readyState === 1) {
          const jsonString = this.packMessage(this.htmlText)
          this.list = [...this.list, JSON.parse(jsonString) ]
          this.websocket.send(jsonString)
          // received remote text clear mine
          this.text = ''
        }
      }
    },
    connect () {
      if (window && window.WebSocket) {
        this.websocket = new WebSocket(this.ws)
        this.websocket.onopen = (e) => {
          // set client info to remote ws server
          this.sendUserInfo()
        }
        this.websocket.onclose = (e) => {
          this.list = [...this.list, JSON.parse(this.packMessage(`WS伺服器連線已關閉，無法進行通訊`)) ]
        }
        this.websocket.onerror = () => {
          this.list = [...this.list, JSON.parse(this.packMessage(`WS伺服器連線出錯【${this.ws}】`)) ]
        }
        this.websocket.onmessage = (e) => {
          this.list = [...this.list, { ...JSON.parse(e.data) }]
        }
      } else {
        console.warn('WebSocket is not available.')
        this.list = [...this.list, JSON.parse(this.packMessage(`不支援 WebSocket 無法進行通訊`))]
      }
    }
  },
  watch: {
    list () {
      // watch list to display the latest message
      // Vue VDOM workaround ... to display the last message
      this.$nextTick(() => {
        this.$refs.box.scrollTop = this.$refs.box.scrollHeight
      })
    },
  },
  mounted () {
    this.connect()
    console.log(this.$config, Electron, this.store, this.address, this.ip)
    this.store.set({
      pyliu: 'awesome'
    })
  },
}
</script>

<style lang="scss" scoped>
.msg-container {
  max-width: 470px;
  margin: 5px;
}

.msg {
  width: 470px;
  margin-left: 5px;
  margin-right: 5px;
  height: 560px;
  overflow: auto;
  padding: 5px;
  border: 1px solid gray;
  display: inline-block;
}
</style>
