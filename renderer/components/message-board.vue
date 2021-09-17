<template lang="pug">
  div(:class="blockCss")
    input(
      multiple 
      ref="file"
      type="file"
      accept=".jpg,.jpeg"
      name="fields[assetsFieldHandle][]"
      id="assetsFieldHandle" 
      @change="onChange"
      v-show="false"
    )
    .msg(
      ref="box"
      @scroll="scrollTop = $event.target.scrollTop"
      @dragover="dragover"
      @dragleave="dragleave"
      @drop="drop"
    )
      b-icon.old-message-arrow(v-if="showOldMessageArrow" icon="arrow-up-circle-fill" font-scale="1.75" variant="muted" :title="`讀取之前${history}筆訊息`" @click="delayLoadHistoryMessage")
      //- transition-group(name="listY")
      message.mr-1.animate__animated(
        enter-active-class="animate__slideInUp"
        leave-active-class="animate__slideInDown"
        v-for="(item, idx) in list"
        :raw="item" :prev="list[idx - 1]"
        :key="`msg-${idx}`" :ref="`msg-${idx}`"
        @reply="$emit('reply', $event)"
      )
</template>

<script>
import debounce from 'lodash/debounce'
export default {
  props: {
    list: { type: Array, required: true },
  },
  data: () => ({
    scrollTop: 0,
    scrollBehavior: 'last',
    filelist: []
  }),
  computed: {
    isChat () { return !this.isAnnouncement && !this.isPersonal },
    isPersonal () { return this.userid === this.currentChannel },
    isAnnouncement () { return this.currentChannel === 'announcement' },
    blockCss () {
      if (this.currentChannel.startsWith('announcement') || this.isPersonal) {
        return 'announcement-container'
      }
      // if (this.isPersonal) {
      //   return 'personal-container'
      // }
      return 'chat-container'
    },
    messageCount () { return this.list.length },
    showOldMessageArrow () { return this.scrollTop < 50 && this.list.length > 0 && !this.fetchingHistory }
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
          !message.mine && !message.system && this.delayAttention(message.$el, { name: this.effect, speed: 'faster' })
        }
      })
    },
    fetchingHistory (flag) {
      this.scrollBehavior = flag ? 'first' : 'last'
    },
    filelist (arr) {
      console.log(arr)
    }
  },
  methods: {
    delayAttention () {}, // placeholder for attention
    delayLoadHistoryMessage () {},  // placeholder for loadHistoryMessage
    loadHistoryMessage () {
      if (this.fetchingHistory) {
        this.warning(`讀取之前訊息中，請稍待 ... `)
      } else if (this.connected) {
        this.$store.commit('fetchingHistory', true)
        const jsonString = JSON.stringify({
          type: "command",
          sender: this.userid,
          date: this.date(),
          time: this.time(),
          message: JSON.stringify({
            command: 'previous',
            channel: this.currentChannel,
            headId: this.list[0].id,
            count: this.history
          }),
          channel: 'system'
        })
        this.websocket.send(jsonString)
        this.scrollBehavior = 'first'
        // in case the ack is missing
        setTimeout(() => { this.$store.commit('fetchingHistory', false) }, 30000)
      } else {
        this.$config.isDev && console.log(
          this.time(),
          `尚未連線無法取得 ${this.currentChannel} 之前訊息資料`,
          this.list[0]
        )
      }
    },
    
    onChange() {
      this.filelist = [...this.$refs.file.files];
    },
    dragover(event) {
      event.preventDefault();
      // Add some visual fluff to show the user can drop its files
      if (!event.currentTarget.classList.contains('bg-green-300')) {
        event.currentTarget.classList.add('bg-green-300');
      }
    },
    dragleave(event) {
      // Clean up
      event.currentTarget.classList.add('bg-gray-100');
      event.currentTarget.classList.remove('bg-green-300');
    },
    drop(event) {
      event.preventDefault();
      this.$refs.file.files = event.dataTransfer.files;
      this.onChange(); // Trigger the onChange event manually
      // Clean up
      event.currentTarget.classList.add('bg-gray-100');
      event.currentTarget.classList.remove('bg-green-300');
    }
  },
  created () {
    this.delayLoadHistoryMessage = debounce(this.loadHistoryMessage, 400)
    this.delayAttention = debounce(this.attention, 600)
  },
  mounted () {
    setTimeout(() => {
      // this.ready = true
      this.$refs.box && (this.$refs.box.scrollTop = this.$refs.box.scrollHeight)
    }, 800)
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
  overflow-y: auto;
  overflow-x: hidden;
  display: inline-block;
}

.old-message-arrow {
  z-index: 1001;
  cursor: pointer;
  position: fixed;
  opacity: 0.3;
  right: 25px;
  top: 72px;
  &:hover {
    transition: all .5s;
    opacity: 1.0;
    color: #007bff !important;
  }
}
</style>