<template lang="pug">
  div(:class="blockCss"): .msg(ref="box" @scroll="scrollTop = $event.target.scrollTop")
    transition(name="bg" mode="out-in"): b-icon.old-message-arrow(v-if="showOldMessageArrow" icon="arrow-up-circle-fill" font-scale="1.75" variant="muted" title="讀取舊訊息" @click="delayLoadHistoryMessage")
    transition-group(name="listY" mode="out-in")
      message(v-for="(item, idx) in list" :raw="item" :prev="list[idx - 1]" :key="`msg-${idx}`" :ref="`msg-${idx}`")
</template>

<script>
import debounce from 'lodash/debounce'
export default {
  props: {
    list: { type: Array, required: true },
  },
  data: () => ({
    ready: false,
    loadHistoryCount: 10,
    scrollTop: 0,
    scrollBehavior: 'last'
  }),
  computed: {
    isChat () { return !this.isAnnouncement && !this.isPersonal },
    isPersonal () { return this.userid === this.currentChannel },
    isAnnouncement () { return this.currentChannel === 'announcement' },
    blockCss () {
      if (this.currentChannel.startsWith('announcement')) {
        return 'announcement-container'
      }
      if (this.isPersonal) {
        return 'personal-container'
      }
      return 'chat-container'
    },
    messageCount () { return this.list.length },
    showOldMessageArrow () { return this.ready && this.scrollTop < 50 && this.list.length > 0 }
  },
  watch: {
    messageCount (dontcare) {
      // watch list to display the first/last message
      this.$nextTick(() => {
        const target = this.scrollBehavior === 'first' ? this.$refs[`msg-0`] : this.$refs[`msg-${this.list.length - 1}`]
        if (this.$refs.box && target) {
          const message = target[0]
          if (message.$el.scrollIntoView) {
            message.$el.scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"})
          } else {
            this.$refs.box.scrollTop = this.scrollBehavior === 'first' ? 0 : this.$refs.box.scrollHeight
          }
          // 'bounce', 'flash', 'pulse', 'rubberBand', 'shakeX', 'shakeY', 'headShake', 'swing', 'tada', 'wobble'
          this.delayAttention(message.$el, { name: 'headShake', speed: 'faster' })
        }
      })
    }
  },
  methods: {
    delayAttention () {}, // placeholder for attention
    delayLoadHistoryMessage () {},  // placeholder for loadHistoryMessage
    loadHistoryMessage () {
      if (this.connected) {
        const jsonString = JSON.stringify({
          type: "command",
          sender: this.userid,
          date: this.date(),
          time: this.time(),
          message: JSON.stringify({
            command: 'previous',
            channel: this.currentChannel,
            headId: this.list[0].id,
            count: this.loadHistoryCount
          }),
          channel: 'system'
        })
        this.websocket.send(jsonString)
        this.scrollBehavior = 'first'
        // reset the scroll behavior to default
        setTimeout(() => { this.scrollBehavior = 'last' }, 400)
      } else {
        this.$config.isDev && console.log(
          this.time(),
          `尚未連線無法取得 ${this.currentChannel} 之前訊息資料`,
          this.list[0]
        )
      }
    }
  },
  created () {
    this.delayLoadHistoryMessage = debounce(this.loadHistoryMessage, 400)
    this.delayAttention = debounce(this.attention, 600)
  },
  mounted () {
    setTimeout(() => this.ready = true, 800)
  }
};
</script>

<style lang="scss" scoped>
.personal-container {
  margin: 5px;
  height: calc(81.5vh - 24px);
}

.announcement-container {
  margin: 5px;
  height: calc(89.5vh - 24px);
}

.chat-container {
  margin: 5px;
  height: calc(73.25vh - 24px);
}

.msg {
  width: 100%;
  height: 100%;
  overflow: auto;
  display: inline-block;
}

.old-message-arrow {
  z-index: 1001;
  cursor: pointer;
  position: fixed;
  opacity: 0.3;
  right: 30px;
  top: 72px;
  &:hover {
    transition: all .5s;
    opacity: 1.0;
    color: #007bff !important;
  }
}
</style>