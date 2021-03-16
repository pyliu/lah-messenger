<template lang="pug">
  .msg-container
    .msg(ref="box")
      .msg-item.d-flex.my-2(v-for="item in list", :class="msgClass(item)")
        p(v-if="item.type === 'remote'") {{ item.text }}
        .time.s-50.mx-1.text-muted {{ item.time }}
        p(v-if="item.type === 'mine'") {{ item.text }}
    b-input-group
      b-input.mr-1(v-model="text" @keyup.enter="send")
      b-button(@click="send" variant="primary") 傳送
</template>

<script>
export default {
  asyncData ({ req, store, redirect, error }) {
    const now = new Date()
    const time = ('0' + now.getHours()).slice(-2) + ':' +
                 ('0' + now.getMinutes()).slice(-2) + ':' +
                 ('0' + now.getSeconds()).slice(-2)
    return {
      name: process.static ? 'static' : (process.server ? 'server' : 'client'),
      list: [
        // { type: 'remote', text: '... 準備中 ...', time: time }
      ]
    }
  },
  data: () => ({
    text: '',
    websocket: undefined
  }),
  methods: {
    msgClass (item) {
      return [item.type === 'mine' ? 'justify-content-end' : 'justify-content-start', item.type]
    },
    time () {
      const now = new Date()
      const time = ('0' + now.getHours()).slice(-2) + ':' +
                   ('0' + now.getMinutes()).slice(-2) + ':' +
                   ('0' + now.getSeconds()).slice(-2)
      return time
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
        this.list = [...this.list, { type: "remote", text: `伺服器連線${this.status(this.websocket.readyState)} ...`, time: this.time() }]
        this.websocket.readyState === 3 && this.connect()
      }
      
      if (this.websocket && this.websocket.readyState === 1) {
        this.list = [...this.list, { type: "mine", text: this.text, time: this.time() }]
        this.websocket.send(this.text)
        // received remote text clear mine
        this.text = ''
      }
    },
    connect () {
      if (window && window.WebSocket) {
        this.websocket = new WebSocket(`ws://${this.$config.websocketHost}:${this.$config.websocketPort}`)
        this.websocket.onopen = (e) => {
          this.list = [...this.list, { type: "remote", text: `連結 WebSocket 伺服器成功(ws://${this.$config.websocketHost}:${this.$config.websocketPort})`, time: this.time() }]
        }
        this.websocket.onclose = (e) => {
          this.list = [...this.list, { type: "remote", text: `WebSocket 伺服器連線已關閉，無法進行通訊`, time: this.time() }]
        }
        this.websocket.onerror = () => {
          this.list = [...this.list, { type: "remote", text: `WebSocket 伺服器連線出錯`, time: this.time() }]
        }
        this.websocket.onmessage = (e) => {
          this.list = [...this.list, { type: "remote", ...JSON.parse(e.data) }]
        }
      } else {
        console.warn('WebSocket is not available.')
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
    console.log(this.$config)
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

  .msg-item {
    position: relative;
    overflow: hidden;
    p {
      display: inline-block;
      border-radius: 10px;
      background: #3c3d5a;
      color: white;
      padding: 2px 12px;
      margin: 0 0 2px 0;
      max-width: 60%;
      text-align: left;
      box-sizing: border-box;
    }

    &.mine {
      p {
        background: rgb(2, 182, 32);
        color: white;
      }
    }
    .time {
      display: inline-block;
      align-self: flex-end;
    }
  }
}
</style>
