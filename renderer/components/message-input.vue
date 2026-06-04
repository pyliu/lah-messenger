<template lang="pug">
div(style="position:relative" @paste="pasteImage($event, pasted)")
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
  b-input-group(v-if="pickUser" size="sm" prepend="傳給")
    b-select(v-model="toUser" :options="toUsersOpts" :disabled="toMe")
    b-checkbox.my-auto.ml-1(v-model="toMe") 給我自己
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
  
  .d-flex.align-items-center
    b-checkbox(v-model="realtime" switch v-if="!emoji") 預覽
    div.mr-auto
    b-button-group.mr-1(size="sm")
      b-button.mr-1(
        v-if="!realtime"
        variant="outline-secondary"
        title="👀 預覽"
        @click="openPreview"
      ): b-img(src="~/assets/img/preview_black_24dp.svg")
      b-button.mr-1(@click="emoji = !emoji" variant="outline-secondary" :title="`挑選表情 ${randFace}`") #[span.h5 {{ randFace }}]
      b-button.mr-1(
        @click="pick"
        variant="outline-success"
        title="附加圖片"
      ): b-icon(icon="images")
      b-button.mr-1(
        @click="send"
        :disabled="notValid"
        :variant="notValid ? 'outline-primary' : 'primary'"
        title="送出"
      ): b-icon(icon="cursor" rotate="45")
      b-button(
        @click="help"
        variant="success"
        title="顯示語法說明"
      ): b-icon(icon="question-circle-fill")
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

  lah-transition(fade): .float-emoji(v-if="emoji" ref="floatEmoji")
    emoji-pickup(@click="addEmoji")

  lah-transition(v-if="realtime"): .d-flex.justify-content-between.p-1.preview.mt-2(v-if="!empty(mergedMessage)" ref="preview")
    span.text-white.font-weight-bold(v-if="isAnnouncementChannel") 預覽
    span.text-white.font-weight-bold(v-else) 將傳給 {{ this.userMap[this.toUser] }}
    announcement-card(
      v-if="isAnnouncementChannel"
      :data-json="announcementJson"
      :channel="to"
      :preview="true"
    )
    message.mr-2.my-message(
      v-else
      :raw="messageJson"
      :preview="true"
    )

</template>

<script>
import AnnouncementCard from '~/components/announcement-card.vue';
import Help from '~/components/help.vue';
import ImageUpload from '~/components/image-upload.vue';
import Message from '~/components/message.vue';

export default {
  name: 'MessageInput',
  components: { ImageUpload, AnnouncementCard, Message, Help },
  props: {
    to: { type: String, required: true },
    text: { type: String, default: '' },
    reply: { type: String, default: '' },
    pickUser: { type: Boolean, default: false }
  },
  data: () => ({
    toMe: false,
    toUser: '',
    realtime: true,
    emoji: false,
    faces: ['😀', '😁', '😂', '😃', '😄', '😅', '😆', '😇', '😈', '😉', '😊', '😋', '😌', '😍', '😎', '😏', '😐', '😑', '😒', '😓', '😔', '😕', '😖', '😗', '😘', '😙', '😚', '😛', '😜', '😝', '😞', '😟', '😡', '😢', '😣', '😤', '😥', '😦', '😧', '😨', '😩', '😪', '😫', '😬', '😭', '😮', '😯', '😰', '😱', '😲', '😳', '😴', '😵', '😶', '😷', '👍', '👌'],
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
  async fetch () {
    const userSetting = await this.$localForage.getItem('message-input-realtime')
    this.realtime = userSetting !== false
    this.toUser = this.userMap[this.to] ? this.to : this.userid
  },
  computed: {
    randFace () { return this.faces[this.$utils._.random(this.faces.length - 1)] },
    titleValid () { return !this.empty(this.messageTitle) && this.$utils.length(this.messageTitle) <= 92 },
    notValid () {
      if (this.isAnnouncementChannel && !this.titleValid) {
        return true
      }
      return this.empty(this.message) && this.empty(this.images)
    },
    toName () { return this.userMap[this.toUser] || this.toUser },
    isAnnouncementChannel () { return this.currentChannel.startsWith('announcement') },
    modalTitle () { return `傳送圖片${this.isAnnouncementChannel ? `到 ${this.currentChannelName}` : `給 ${this.toName}`}` },
    mergedMessage () {
      // 🟢 [修復] 發送前先將網路路徑與本機路徑保護起來
      const protectedText = this.protectLocalPath(this.message);

      if (this.$utils.empty(this.images)) {
        return protectedText
      }
      let imgMdText = this.images.map((base64, idx) => {
        return `![給${this.toName}${idx}](${base64})`
      }).join('\n')

      return `${protectedText}\n\n***\n\n${imgMdText}`
    },
    markdMergedMessage () {
      // return DOMPurify?.sanitize(Markd(this.mergedMessage.replaceAll('\n', '  \n')))
      return this.$utils.convertMarkd(this.mergedMessage)
    },
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
        channel: this.toUser,
        date: this.date(),
        time: this.time(),
        // message: this.markdMergedMessage,
        message: this.mergedMessage,
        prepend: false,
        sender: this.userid,
        type: "remote"
      }
    },
    toUsersOpts () {
      const opts = [
        ...this.$utils.orderBy(
          this.$utils.uniqBy(this.connectedUsers.map((user) => {
            return { value: user.userid, text: `${user.userid} ${user.username}`}
          }), 'value'),
          'value'
        )
      ]

      const found = opts.find(opt => {
        return opt.value === this.toUser
      })
      !found && this.userMap[this.toUser] && opts.unshift({ value: this.toUser, text: `${this.toUser} ${this.userMap[this.toUser]}` })
      return opts
    }
  },
  watch: {
    toMe (flag) {
      flag && (this.toUser = this.userid)
    },
    emoji (flag) {
      this.$nextTick(() => {
        flag && (this.$refs.floatEmoji.style.top = this.empty(this.reply) ? '20px' : '-20px')
      })
    },
    realtime (flag) {
      this.$localForage.setItem('message-input-realtime', flag)
    }
  },
  created () {
    // to refresh toUsersOpts
    this.queryOnlineClients()
  },
  methods: {
    // 🟢 [新增] 自動保護網路路徑/本機路徑的正則替換方法
    protectLocalPath(text) {
      if (!text) return '';
      return String(text)
        .replace(/(?<!`)(["'])(\\\\[a-zA-Z0-9_.-]+\\[^\r\n]+?|[a-zA-Z]:\\[^\r\n]+?)\1(?!`)/g, '`$2`')
        .replace(/(?<!`)(\\\\[a-zA-Z0-9_.-]+\\[^\s`<>]+|[a-zA-Z]:\\[^\s`<>]+)(?!`)/g, '`$1`');
    },

    pasted (base64) {
      this.images.indexOf(base64) === -1 && this.images.push(base64)
    },
    addEmoji (emoji) {
      const element = this.$refs.msgTextarea
      if (element && element.selectionStart) {
        const st = element.selectionStart
        const ed = element.selectionEnd
        const front = this.message.substring(0, st).trim()
        const appended = front + ' ' + emoji + ' '
        const tail = this.message.substring(ed, this.message.length).trim()
        this.message = appended + tail
        element.focus()
        this.$nextTick(() => { element.selectionEnd = appended.length })
      } else {
        this.message = this.message + ' ' + emoji
        element.focus()
      }
      this.emoji = false
    },
    openPreview () {
      const modalOpts = {
        size: 'xl',
        title: '預覽'
      }
      if (this.isAnnouncementChannel) {
        this.modal(this.$createElement(AnnouncementCard, {
          props: {
            dataJson: this.announcementJson,
            channel: this.toUser,
            preview: true
          }
        }), modalOpts)
      } else {
        this.modal(this.$createElement(Message, {
          props: {
            raw: this.messageJson,
            preview: true
          }
        }), modalOpts)
      }
    },
    pick () {
      this.modal(this.$createElement(ImageUpload, {
        props: {
          to: this.toUser,
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
          channel: this.currentChannel.startsWith('announcement') ? this.currentChannel : this.toUser,
          title: this.messageTitle,
          priority: this.priority
        }))
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
    },
    help () {
      this.modal(this.$createElement(Help), {
        size: 'xl',
        title: `進階編輯語法說明`
      })
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
.float-emoji {
  z-index: 1002;
  position:absolute;
  // top: -20px;
  opacity: .85;
  border-radius: 15px;
  background-color: lightgrey;
  width: 90vw;
  height: 20vh;
  overflow: auto;
}
</style>