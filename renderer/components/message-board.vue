<template lang="pug">
  div(:class="blockCss")
    .msg(
      ref="box"
      @scroll="scrollTop = $event.target.scrollTop"
      @dragover="dragover"
      @dragleave="dragleave"
      @drop="drop"
      @click="showModalById('upload-modal')"
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

    b-modal(
      id="upload-modal"
      hide-footer
      centered
      size="xl"
      scrollable
      no-close-on-backdrop
    )
      template(#modal-title) 上傳圖片
      //- template(#default="{ ok, cancel, hide }")
      div(
        @dragover="dragover"
        @dragleave="dragleave"
        @drop="drop"
      )
        .d-flex
          b-file(
            v-model="uploadImage"
            placeholder="*.jpg"
            drop-placeholder="放開以設定上傳檔案"
            accept="image/jpeg"
          ): template(slot="file-name" slot-scope="{ names }"): b-badge(variant="primary") {{ names[0] }}
          //- b-button.ml-1(
          //-   variant="outline-dark"
          //-   title="上傳"
          //-   @click="upload"
          //-   :disabled="$utils.empty(uploadImage)"
          //-   no-icon-gutter
          //- )
          //-   b-icon(icon="upload")
        b-img.my-1(
          v-if="!$utils.empty(uploadedDataUri)"
          :src="uploadedDataUri"
          thumbnail
          fluid
        )
        hr
        b-img.my-1(
          v-for="(dataUri, idx) in imageMemento"
          v-if="!$utils.empty(dataUri)"
          :key="`imgMemento_${idx}`"
          :src="dataUri"
          thumbnail
          fluid
          style="max-width: 122.5px"
        )
</template>

<script>
import debounce from 'lodash/debounce'
export default {
  props: {
    list: { type: Array, required: true },
  },
  data: () => ({
    displayOldMessageArrow: false,
    scrollTop: 0,
    scrollBehavior: 'last',
    uploadImage: undefined,
    uploadedDataUri: ''
  }),
  computed: {
    isMine () { return this.userid === this.currentChannel },
    isChat () { return !this.isAnnouncement && !this.isMine },
    isAnnouncement () { return this.currentChannel === 'announcement' },
    isDepartment () { return this.currentChannel.startsWith('announcement_') },
    blockCss () {
      if (this.isAnnouncement || this.isDepartment || this.isMine) {
        return 'announcement-container'
      }
      // if (this.isMine) {
      //   return 'personal-container'
      // }
      return 'chat-container'
    },
    messageCount () { return this.list.length },
    showOldMessageArrow () { return this.displayOldMessageArrow && this.scrollTop < 50 && this.list.length > 0 && !this.fetchingHistory }
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
    lastEncodedImage (val) {
      console.log(val)
    },
    uploadImage (dontcare) {
      this.upload()
    }
  },
  methods: {
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
    delayAttention () {/* placeholder for attention */},
    delayLoadHistoryMessage () {/* placeholder for loadHistoryMessage */},
    upload () {
      if (this.currentChannel.startsWith('announcement') || this.currentChannel === this.userid) {
        this.warn('公告信差版面不支援檔案直接上傳', this.currentChannel)
      } else {
        this.isBusy = true
        this.uploadedDataUri = ''
        const formData = new FormData()
        formData.append('file', this.uploadImage)
        formData.append('width', 320)
        formData.append('height', 240)
        formData.append('quality', 75)
        this.$upload.post(this.$consts.API.FILE.BASE64, formData).then(({ data }) => {
          if (!this.$utils.empty(data.encoded) && !this.$utils.empty(data.uri)) {
            this.uploadedDataUri = `${data.uri}${data.encoded}`
            this.$store.commit('addImageMemento', this.uploadedDataUri)
            this.$localForage.setItem(this.imageMementoCacheKey, this.imageMemento).catch((err) => {
              this.$utils.error('快取上傳圖檔失敗', err);
            })
            if (!this.$utils.statusCheck(data.status)) {
              this.warning(data.message, { title: '上傳圖檔結果' })
            }
          } else {
            this.warning('回傳的影像編碼有誤', { title: '上傳圖檔結果' })
          }
        }).catch((err) => {
          this.$utils.error(err)
        }).finally(() => {
          this.isBusy = false
        })
      }
    },
    dragover(event) {
      event.preventDefault();
      // Add some visual fluff to show the user can drop its files
      if (!event.currentTarget.classList.contains('bg-light')) {
        event.currentTarget.classList.add('bg-light');
      }
    },
    dragleave(event) {
      // Clean up
      event.currentTarget.classList.remove('bg-light');
    },
    drop(event) {
      event.preventDefault();
      if (this.currentChannel.startsWith('announcement') || this.currentChannel === this.userid) {
        this.warn('公告信差版面不支援檔案直接上傳', this.currentChannel)
      } else if (event.dataTransfer.files.length > 0) {
        this.uploadImage = event.dataTransfer.files[0]
        // auto uploading after drop file
        this.upload()
        this.showModalById('upload-modal')
      } else {
        this.log('僅支援拖放實體檔案')
      }
      // Clean up
      event.currentTarget.classList.remove('bg-light');
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
      this.displayOldMessageArrow = true
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