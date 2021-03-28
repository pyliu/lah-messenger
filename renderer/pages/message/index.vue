<template lang="pug">
  div
    .msg-container
      .msg(ref="box"): transition-group(name="list" mode="out-in")
        message(v-for="(item, idx) in list" :raw="item" :key="'msg-'+idx")
      b-input-group.mx-auto(size="sm")
        b-textarea.mr-1(
          v-model="text"
          debounce="200"
          placeholder="... Ctrl + Enter 直接送出 ..."
          @keyup.ctrl.enter="send"
          no-resize
          no-auto-shrink
          autofocus
        )
        b-button(@click="send" variant="primary") 傳送
    //- div
    //-   div(v-for="(entry, idx) in messages.entries()") {{ entry }}
        
</template>

<script>
import Electron from 'electron'
import message from '~/components/message.vue'
import { ipv6, ipv4 } from '~/assets/js/ip.js'

export default {
  components: { message },
  head: {
    title: `桃園地政事務所 - ${ipv4} / ${ipv6}`
  },
  asyncData ({ req, store, redirect, error }) {
    return {
      name: process.static ? 'static' : (process.server ? 'server' : 'client')
    }
  },
  data: () => ({
    text: '',
    timer: null
  }),
  computed: {
    channel () {
      return process.env['USERNAME']
    },
    list () {
      return this.messages[this.channel]
    }
  },
  watch: {
    list (dontcare) {
      // watch list to display the latest message
      // Vue VDOM workaround ... to display the last message
      this.$nextTick(() => {
        this.$refs.box.scrollTop = this.$refs.box.scrollHeight
      })
    },
    messages (obj) {
      console.log(obj)
    }
  },
  methods: {
    send () {
      if (this.sendTo(this.text, this.channel)) {
        this.text = ''
      }
    }
  },
  created () {
    // create new empty channel in Vuex store
    this.$store.commit('addChannel', this.channel)
  },
  mounted () {
    // connect to ws server
    this.connect()
    // set timer to reconnect to server every 20s
    this.timer = setInterval(() => { this.connect() }, 20000)
    // testing
    console.log(this.$config, Electron, this.estore, this.messages)
    this.estore.set({
      pyliu: 'awesome'
    })
    
  },
  beforeDestroy () {
    clearTimeout(this.timer)
  }
}
</script>

<style lang="scss" scoped>
.msg-container {
  max-width: 470px;
  margin: 5px;
}

.msg {
  width: 470px;
  height: 560px;
  overflow: auto;
  padding: 5px;
  border: 1px solid gray;
  display: inline-block;
}

.list-enter-active, .list-leave-active {
  transition: all .4s;
}

.list-enter, .list-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>
