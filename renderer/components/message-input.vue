<template lang="pug">
div
  lah-transition(v-if="preview"): .d-flex.justify-content-between.p-1.preview.mb-1(v-if="!empty(mergedMessage)")
    span.text-white.font-weight-bold 預覽
    announcement-card(v-if="isAnnouncementChannel" :data-json="announcementJson" :channel="to")
    message.mr-2(v-else :raw="messageJson" style="opacity: 1 !important; max-width: 100%;")

  .d-flex(v-if="isAnnouncementChannel")
    b-input-group.mr-auto(size="sm" prepend="標題"): b-input(
      v-model="messageTitle"
      placeholder=" ... 必要欄位 ..."
      v-b-tooltip.focus="`輸入 ${$utils.length(messageTitle)} / 92 個字元`"
      :state="titleValid"
    )
    b-input-group.priority.ml-1(size="sm" prepend="緊急程度"): b-select(
      v-model="priority"
      :options="priorityOpts"
    )
  b-textarea.my-2(
    ref="msgTextarea"
    v-model="message"
    debounce="200"
    placeholder="... 訊息內容 ...",
    size="sm"
    rows="5"
    no-resize
    no-auto-shrink
    autofocus
  )
  
  .d-flex.align-items-center.justify-content-end
    b-button-group(size="sm")
      b-button(
        v-if="!preview"
        size="sm"
        variant="outline-secondary"
        title="預覽"
        @click="preview"
      ): b-img(src="~/assets/img/preview_black_24dp.svg")
      b-button.mx-1(
        @click="pick"
        size="sm"
        variant="outline-success"
        title="附加圖片"
      ): b-icon(icon="images")
      b-button(
        @click="send"
        size="sm"
        :disabled="notValid"
        :variant="notValid ? 'outline-primary' : 'primary'"
        title="送出"
      ): b-icon(icon="cursor" rotate="45")
  .d-flex.flex-wrap.align-items-center
    transition-group(name="listY" mode="out-in")
      b-img.memento.m-1(
        v-for="(base64data, idx) in images"
        :key="`imgAttached_${idx}`"
        :src="base64data"
        @click="remove(base64data)"
        thumbnail
        fluid
        v-b-tooltip="'刪除這張圖片'"
        style="width: 138.5px"
      )
</template>

<script>
import ImageUpload from '~/components/image-upload.vue'
import AnnouncementCard from '~/components/announcement-card.vue'
import Message from '~/components/message.vue'
import DOMPurify from 'dompurify'
import Markd from 'marked'

export default {
  name: 'MessageInput',
  components: { ImageUpload, AnnouncementCard, Message },
  props: {
    to: { type: String, required: true },
    text: { type: String, default: '' },
    reply: { type: String, default: '' },
    preview: { type: Boolean, default: true }
  },
  data: () => ({
    messageTitle: '',
    priority: 3,
    message: '',
    images: [],
    priorityOpts: [
      { text: '最高', value: 0 },
      { text: '高', value: 1 },
      { text: '中', value: 2 },
      { text: '正常', value: 3 }
    ]
  }),
  computed: {
    titleValid () { return !this.empty(this.messageTitle) && this.$utils.length(this.messageTitle) <= 92 },
    notValid () {
      if (this.isAnnouncementChannel && !this.titleValid) {
        return true
      }
      return this.empty(this.message) && this.empty(this.images)
    },
    toName () { return this.userMap[this.to] || this.to },
    isAnnouncementChannel () { return this.currentChannel.startsWith('announcement') },
    modalTitle () { return `傳送圖片${this.isAnnouncementChannel ? `到 ${this.currentChannelName}` : `給 ${this.toName}`}` },
    mergedMessage () {
        let imgMdText = this.images.map((base64, idx) => {
          return `![給${this.toName}${idx}](${base64})`
        }).join('<hr style="margin:5px"/>')
        if (!this.empty(this.message) && !this.empty(imgMdText)) {
          imgMdText = `<hr style="margin:5px"/> ${imgMdText}`
        }
        return `${this.message}${imgMdText}`
    },
    markdMergedMessage () { return DOMPurify?.sanitize(Markd(this.mergedMessage.replaceAll('\n', '  \n'))) },
    announcementJson () {
      // announcement-card required json
      return {
        id: 0,
        create_datetime: `${this.date()} ${this.time()}`,
        expire_datetime: '',
        title: this.messageTitle,
        content: this.mergedMessage,
        flag: 0,
        from_ip: '',
        priority: this.priority,
        sender: this.userid
      }
    },
    messageJson () {
      return {
        id: 0,
        channel: this.to,
        date: this.date(),
        time: this.time(),
        message: this.markdMergedMessage,
        prepend: false,
        sender: this.userid,
        type: "remote"
      }
    }
  },
  methods: {
    preview () {
      const modalOpts = {
        size: 'xl',
        title: '預覽'
      }
      if (this.isAnnouncementChannel) {
        this.modal(this.$createElement(AnnouncementCard, {
          props: {
            dataJson: this.announcementJson,
            channel: this.to
          }
        }), modalOpts)
      } else {
        this.modal(this.$createElement(Message, {
          props: { raw: this.messageJson  }
        }), modalOpts)
      }
    },
    pick () {
      this.modal(this.$createElement(ImageUpload, {
        props: {
          to: this.to,
          modalId: 'image-upload-modal',
          skipPreview: true
        },
        on: {
          publish: (base64EncodedData) => {
            // received publish event from image-upload component and add latestimageMemento to Set
            this.images.indexOf(base64EncodedData) === -1 && this.images.push(base64EncodedData)
          }
        }
      }), {
        id: 'image-upload-modal',
        size: 'xl',
        title: this.modalTitle
      })
    },
    send () {
      if (this.websocket && !this.notValid) {
        // send to target
        this.websocket.send(this.packMessage(this.mergedMessage, {
          channel: this.to,
          title: this.messageTitle,
          priority: this.priority
        }))
        if (this.to !== this.userid && !this.to?.startsWith('announcement') && !this.chatRooms.includes(this.currentChannel)) {
          const replyHeader = this.packReplyHeader(this.to, this.toName, this.reply)
          // also send to own channel to simulate talking between eachothers
          this.websocket.send(
            this.packMessage(`${replyHeader} ${this.mergedMessage}`, {
              channel: this.userid,
              title: this.messageTitle,
              priority: this.priority
            })
          )
        }
      }
      this.$emit("sent", this.message)
      this.message = ''
      this.$refs.msgTextarea && this.$refs.msgTextarea.focus()
    },
    remove (base64data) {
      var index = this.images.indexOf(base64data)
      if (index > -1) {
        this.images.splice(index, 1)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.memento:hover {
  border: 5px dashed rgb(194, 6, 6);
  padding: 2px;
  cursor: pointer;
}
.priority {
  max-width: 145px;
}
.preview {
  z-index: 1001;
  opacity: .85;
  border-radius: 10px;
  background-color: gray;
  width: 100%;
}
</style>
