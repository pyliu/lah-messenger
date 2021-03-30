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
import messageMixin from '~/pages/message/messageMixin.js'
import message from '~/components/message.vue'
import { ipv6, ipv4 } from '~/assets/js/ip.js'

export default {
  components: { message },
  mixins: [ messageMixin ],
  head: {
    title: `桃園地政事務所 - ${ipv4} / ${ipv6}`
  },
  asyncData ({ req, store, redirect, error }) {
    return {
      name: process.static ? 'static' : (process.server ? 'server' : 'client')
    }
  },
  data: () => ({
    text: ''
  }),
  watch: {
    list (dontcare) {
      // watch list to display the latest message
      // Vue VDOM workaround ... to display the last message
      this.$nextTick(() => {
        this.$refs.box.scrollTop = this.$refs.box.scrollHeight
      })
    }
  },
  methods: {
    send () {
      if (this.sendTo(this.text, this.channel)) {
        this.text = ''
      }
    }
  },
  mounted () {
    // connect to ws server
    this.connect()
    // testing
    // console.log(this.$config, Electron, this.estore, this.messages)
    this.estore.set({
      pyliu: 'awesome'
    })
    
  }
}
</script>

<style lang="scss" scoped>
</style>
