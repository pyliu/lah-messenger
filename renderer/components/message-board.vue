<template lang="pug">
  div(:class="blockCss"): .msg(ref="box")
    transition(name="listY" mode="out-in"): b-icon.old-message-arrow(v-if="showOldMessageArrow" icon="arrow-up-circle-fill" font-scale="2.25" variant="muted" title="讀取舊訊息" @click="delayLoadHistoryMessage")
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
    showOldMessageArrow: false,
    loadHistoryCount: 10,
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
    messageCount () { return this.list.length }
  },
  watch: {
    messageCount (dontcare) {
      // watch list to display the latest message
      // Vue VDOM workaround ... to display the last message
      this.$nextTick(() => {
        if (this.$refs.box && this.$refs[`msg-${this.list.length - 1}`]) {
          const latest = this.$refs[`msg-${this.list.length - 1}`][0]
          latest.$el.scrollIntoView && latest.$el.scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"})
          !latest.$el.scrollIntoView && (this.$refs.box.scrollTop = this.$refs.box.scrollHeight)
          // 'bounce', 'flash', 'pulse', 'rubberBand', 'shakeX', 'shakeY', 'headShake', 'swing', 'tada', 'wobble'
          (this.isPersonal || this.isAnnouncement) && this.attention(latest.$el, { name: 'tada', speed: 'slow' })
          // this.$refs.box.scrollTop = this.$refs.box.scrollHeight
        }
      })
    }
  },
  methods: {
    delayLoadHistoryMessage () {},  // placeholder for loadHistoryMessage
    loadHistoryMessage () {
      this.notify(`ready to load history message for ${this.currentChannel}`)
    }
  },
  created () {
    this.delayLoadHistoryMessage = debounce(this.loadHistoryMessage, 400)
  },
  mounted () {
    setTimeout(() => this.showOldMessageArrow = true, 800)
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
  top: 67px;
  &:hover {
    opacity: 1.0;
    color: #007bff !important;
  }
}
</style>