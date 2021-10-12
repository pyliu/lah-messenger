<template lang="pug">
  .center(v-if="loading" style="height: 80vh"): b-icon(font-scale="3" icon="circle-fill" animation="throb" variant="secondary")
  div(v-else :class="blockCss")
    .msg(
      ref="box"
      @scroll="scrollTop = $event.target.scrollTop"
      @dragover="dragover"
      @dragleave="dragleave"
      @drop="drop"
    )
      b-icon.old-message-arrow(v-if="showOldMessageArrow" icon="arrow-up-circle-fill" font-scale="2" variant="muted" :title="`讀取之前${history}筆訊息`" @click="delayLoadHistoryMessage")
      b-button.leave-message-btn(
        v-if="(!chatRooms.includes(currentChannel) && isAuthorized)"
        @click="openMessageInput"
        size="lg"
        variant="primary"
        :title="`發布訊息@${currentChannelName}`"
      ): b-icon(icon="chat-right-text" flip-h)
      
      h5.center.my-5(v-if="empty(list)")
        b-icon.mr-1(icon="shield-fill-exclamation" variant="success")
        span 目前尚無任何訊息 
      transition-group(v-else name="list" mode="out-in")
        message.mr-1.animate__animated(
          enter-active-class="animate__slideInUp"
          leave-active-class="animate__slideInDown"
          v-for="(item, idx) in list"
          :raw="item" :prev="list[idx - 1]"
          :key="`msg-${idx}`"
          :ref="`msg-${idx}`"
          @reply="$emit('reply', $event)"
          @remove="$emit('remove', $event)"
        )
</template>

<script>
import debounce from 'lodash/debounce'
import MessageInput from '~/components/message-input.vue'

export default {
  components: { MessageInput },
  props: {
    list: { type: Array, required: true }
  },
  data: () => ({
    loading: true,
    displayOldMessageArrow: false,
    scrollTop: 0,
    scrollBehavior: 'last',
    dropImage: undefined,
    pickedEncodingData: ''
  }),
  computed: {
    isAuthorized () {
      if (this.currentChannel === this.userid) {
        return true
      }
      return this.authority.isAdmin || this.authority.isNotifyMgtStaff
    },
    isMine () { return this.userid === this.currentChannel },
    isChat () { return !this.isAnnouncement && !this.isMine },
    isAnnouncement () { return this.currentChannel === 'announcement' },
    isDepartment () { return this.currentChannel.startsWith('announcement_') },
    blockCss () {
      if (this.isAnnouncement || this.isDepartment || this.isMine) {
        return 'announcement-container'
      }
      return 'chat-container'
    },
    messageCount () { return this.list.length },
    showOldMessageArrow () { return this.displayOldMessageArrow && this.scrollTop < 50 && this.list.length > 0 && !this.fetchingHistory }
  },
  watch: {
    messageCount (n, o) {
      o > n && (this.loading = true)
      // watch list count to scroll viewport to display the first/last message
      this.delayScrollToMessage()
    },
    fetchingHistory (flag) {
      this.timeout(() => { this.scrollBehavior = flag ? 'first' : 'last' }, 600)
    },
    dropImage (file) {
      file ? this.upload() : this.debug('選定的上傳檔案是空的')
    },
    loading (flag) {
      !flag && this.delayScrollToMessage()
    }
  },
  methods: {
    delayScrollToMessage () {/* placeholder for scrolling */},
    delayAttention () {/* placeholder for attention */},
    delayLoadHistoryMessage () {/* placeholder for loadHistoryMessage */},
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
        this.log(`尚未連線無法取得 ${this.currentChannel} 之前訊息資料`)
      }
    },
    upload (directly = false) {
      if (!this.dropImage) {
        this.warn('dropImage無值，無法上傳檔案', this.dropImage)
      }
      else if (this.currentChannel.startsWith('announcement') || this.currentChannel === this.userid) {
        this.warning('非聊天室不支援JPEG直接上傳')
      } else if (this.dropImage?.type === 'image/jpeg') {
        this.isBusy = true
        this.pickedEncodingData = ''
        const filename = this.dropImage.name
        const formData = new FormData()
        formData.append('file', this.dropImage)
        formData.append('width', 1920)
        formData.append('height', 1080)
        formData.append('quality', 80)
        this.$upload.post(this.uploadUrl, formData).then(({ data }) => {
          if (!this.$utils.empty(data.encoded) && !this.$utils.empty(data.uri)) {
            this.pickedEncodingData = `${data.uri}${data.encoded}`
            this.$store.commit('addImageMemento', this.pickedEncodingData)
            this.$localForage.setItem(this.imageMementoCacheKey, this.imageMemento).catch((err) => {
              this.err('快取上傳圖檔失敗', err);
            })
            if (this.$utils.statusCheck(data.status)) {
              if (directly) {
                // send the image right away
                this.sendImage(this.pickedEncodingData, filename, this.currentChannel)
              }
            } else {
              this.warning(data.message, { title: '上傳圖檔結果' })
            }
          } else {
            this.warning('回傳的影像編碼有誤', { title: '上傳圖檔結果' })
          }
        }).catch((err) => {
          this.err(err)
        }).finally(() => {
          this.isBusy = false
          // this.dropImage = undefined
        })
      } else {
        this.warning('僅支援 JPG/PNG/GIF 圖檔上傳')
      }
    },
    publish () {
      this.confirm('立即發送這張圖片?').then((YN) => {
        if (YN) {
          this.sendImage(this.pickedEncodingData)
          this.pickedEncodingData = ''
          this.hideModalById('upload-modal')
        }
      })
    },
    dragover (event) {
      event.preventDefault();
      // Add some visual fluff to show the user can drop its files
      if (!event.currentTarget.classList.contains('dropable')) {
        event.currentTarget.classList.add('dropable');
      }
    },
    dragleave (event) {
      // Clean up
      event.currentTarget.classList.remove('dropable');
    },
    drop (event) {
      event.stopPropagation() // Stops some browsers from redirecting
      event.preventDefault()
      // this.debug(event.dataTransfer)
      if (this.currentChannel.startsWith('announcement') || this.currentChannel === this.userid) {
        this.warning('非聊天室不支援JPEG直接上傳')
      } else if (event.dataTransfer.files.length > 0) {
        this.dropImage = event.dataTransfer.files[0]
        this.upload(true)
      } else {
        this.warning('僅支援拖放JPEG圖檔')
      }
      // Clean up
      event.currentTarget.classList.remove('dropable');
    },
    getLastSender () {
      const lastRemoteMessage = [...this.list].reverse().find(message => {
        return message.type === 'remote' && message.sender !== this.userid
      })
      return lastRemoteMessage?.sender
    },
    openMessageInput () {
      this.modal(this.$createElement(MessageInput, {
        props: {
          to: this.getLastSender() || this.currentChannel,
          pickUser: this.currentChannel === this.userid // my channel shows the online user select input
        },
        on: {
          sent: () => { this.hideModalById('message-input-modal') }
        }
      }), {
        id: 'message-input-modal',
        size: 'xl',
        title: this.currentChannelName
      })
    },
    scrollToMessage () {
      const target = this.scrollBehavior === 'first' ? this.$refs[`msg-0`] : this.$refs[`msg-${this.list.length - 1}`]
      if (this.$refs.box && target) {
        const message = target[0]
        if (message.$el.scrollIntoView && this.currentChannelMessageCount > 10) {
          message.$el.scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"})
        } else {
          this.$refs.box.scrollTop = this.scrollBehavior === 'first' ? 0 : this.$refs.box.scrollHeight
        }
        !message.mine && !message.system && this.delayAttention(message.$el, { name: this.effect, speed: 'faster' })
      }
    }
  },
  created () {
    this.delayLoadHistoryMessage = debounce(this.loadHistoryMessage, 400)
    this.delayAttention = debounce(this.attention, 600)
    this.delayScrollToMessage = debounce(() => {
      this.loading = false
      this.scrollToMessage()
    }, 250)
  },
  mounted () {
    setTimeout(() => {
      // this.$refs.box && (this.$refs.box.scrollTop = this.$refs.box.scrollHeight)
      this.displayOldMessageArrow = true
      // in case no message coming
      this.loading = false
    }, 1200)
  }
};
</script>

<style lang="scss" scoped>
.memento:hover {
  border: 5px dashed gray;
  padding: 2px;
  cursor: pointer;
}

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
  height: calc(73.25vh - 34px);
}

.msg {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  display: inline-block;
}

.old-message-arrow {
  transition: all .5s;
  z-index: 1001;
  cursor: pointer;
  position: fixed;
  opacity: 0.3;
  right: 15px;
  top: 75px;
  &:hover {
    opacity: 1.0;
    color: #007bff !important;
  }
}

.leave-message-btn {
  transition: all 1s;
  z-index: 1001;
  position: fixed;
  opacity: 0.5;
  left: -50px;
  top: 120px;
  &:hover {
    transition: all .5s;
    opacity: 1.0;
    left: 0px;
  }
}
</style>