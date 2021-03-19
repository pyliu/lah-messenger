<template lang="pug">
  .msg-container
    .msg(ref="box")
      message(v-for="(item, idx) in list" :raw="item" :key="idx")
    b-input-group
      b-input.mr-1(v-model="text" @keyup.enter="send")
      b-button(@click="send" variant="primary") 傳送
</template>

<script>
import Electron from 'electron';
import * as EStore from 'electron-store';
import message from '~/components/message.vue';

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
    ws () { return `ws://${this.$config.websocketHost}:${this.$config.websocketPort}` }
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
        type: 'mine',
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
    send () {
      /**
       * readyState attr
       * CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3
       */
      if (this.websocket && this.websocket.readyState !== 1) {
        this.list = [...this.list, JSON.parse(this.packMessage(`伺服器連線${this.status(this.websocket.readyState)} ...`)) ]
        this.websocket.readyState === 3 && this.connect()
      }
      
      if (this.websocket && this.websocket.readyState === 1) {
        this.list = [...this.list, JSON.parse(this.packMessage(this.text)) ]
        this.websocket.send(this.text)
        // received remote text clear mine
        this.text = ''
      }
    },
    connect () {
      if (window && window.WebSocket) {
        this.websocket = new WebSocket(`ws://${this.$config.websocketHost}:${this.$config.websocketPort}`)
        this.websocket.onopen = (e) => {
          this.notify(`連結 WebSocket 伺服器成功`, {
            subtitle: this.ws,
            type: 'success',
            pos: 'tf'
          })
        }
        this.websocket.onclose = (e) => {
          this.notify(`WebSocket 伺服器連線已關閉，無法進行通訊`, {
            subtitle: this.ws,
            type: 'warning',
            pos: 'bf'
          })
        }
        this.websocket.onerror = () => {
          this.notify(`WebSocket 伺服器連線出錯`, {
            subtitle: this.ws,
            type: 'danger',
            pos: 'bf'
          })
        }
        this.websocket.onmessage = (e) => {
          this.list = [...this.list, { ...JSON.parse(e.data) }]
        }
      } else {
        console.warn('WebSocket is not available.')
        this.list = [...this.list, { type: "remote", text: '不支援 WebSocket 無法進行通訊', time: this.time() }]
      }
    }
  },
  watch: {
    list () {
      // watch list to display the latest message
      // Vue VDOME workaround ... to display the last message
      this.$nextTick(() => {
        this.$refs.box.scrollTop = this.$refs.box.scrollHeight
      })
    },
  },
  mounted () {
    this.connect()
    console.log(this.$config, Electron, this.store)
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
