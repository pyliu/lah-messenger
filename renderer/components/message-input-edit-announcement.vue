<template lang="pug">
div(style="position:relative" @paste="pasteImage($event, pasted)")
  .d-flex
    b-input-group.mr-auto(size="sm" prepend="標題"): b-input(
      v-model="title"
      placeholder=" ... 必要欄位 ..."
      v-b-tooltip.focus="`輸入 ${$utils.length(title)} / 92 個字元`"
      :state="titleValid"
    )
    b-input-group.priority.ml-1(size="sm" prepend="緊急程度"): b-select(
      v-model="priority"
      :options="priorityOpts"
    )
  b-textarea.my-2(
    ref="msgTextarea"
    v-model="content"
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

  lah-transition: .d-flex.justify-content-between.p-1.preview.mt-2(v-if="realtime && !empty(mergedMessage)" ref="preview")
    span.text-white.font-weight-bold 編輯預覽
    announcement-card(
      :data-json="announcementJson"
      :channel="channel"
      :preview="true"
    )

</template>

<script>
import ImageUpload from '~/components/image-upload.vue'
import AnnouncementCard from '~/components/announcement-card.vue'
import Help from '~/components/help.vue'

export default {
  name: 'MessageInputEditAnnouncement',
  components: {
    ImageUpload: () => import('~/components/image-upload.vue'),
    // to fix recursive component import
    AnnouncementCard: () => import('~/components/announcement-card.vue'),
    Help
  },
  props: {
    /**
      content: "XXXXXX"
      create_datetime: "2022-02-17 16:34:50"
      expire_datetime: ""
      flag: 0
      from_ip: "192.168.XXX.XXX"
      id: 9
      priority: 1
      sender: "HAXXXXXXXX"
      title: "系統連結"
     */
    dataJson: { type: Object, require: true },
    channel: { type: String, require: true }
  },
  data: () => ({
    realtime: true,
    emoji: false,
    faces: ['😀', '😁', '😂', '😃', '😅', '😆', '👍', '👌'],
    images: [],
    priorityOpts: [
      { text: '最高', value: 0 },
      { text: '高', value: 1 },
      { text: '中', value: 2 },
      { text: '正常', value: 3 }
    ],
    title: '',
    priority: 3,
    content: ''
  }),
  async fetch () {
    const userSetting = await this.$localForage.getItem('message-input-realtime')
    this.realtime = userSetting !== false
  },
  computed: {
    id () { return this.dataJson?.id },
    randFace () { return this.faces[this.$utils._.random(this.faces.length - 1)] },
    titleValid () { return !this.empty(this.title) && this.$utils.length(this.title) <= 92 },
    notValid () {
      if (!this.titleValid) {
        return true
      }
      return this.empty(this.content) && this.empty(this.images)
    },
    modalTitle () { return `傳送圖片到 ${this.currentChannelName}` },
    mergedMessage () {
      if (this.empty(this.images)) {
        return this.content
      }
      let imgMdText = this.images.map((base64, idx) => {
        return `![公告圖${idx}](${base64})`
      }).join('\n')
      return `${this.content}<hr/>${imgMdText}`
    },
    announcementJson () {
      // announcement-card required json
      return {
        id: this.id,
        create_datetime: `${this.date()} ${this.time()}`,
        title: this.title,
        content: this.mergedMessage,
        priority: this.priority,
        sender: this.userid,
        flag: this.dataJson.flag,
        from_ip: this.dataJson.from_ip,
        expire_datetime: this.dataJson.expire_datetime
      }
    }
  },
  watch: {
    emoji (flag) {
      this.$nextTick(() => {
        flag && (this.$refs.floatEmoji.style.top = '20px')
      })
    },
    realtime (flag) {
      this.$localForage.setItem('message-input-realtime', flag)
    }
  },
  created () {
    this.normalize(this.dataJson?.content)
    this.priority = this.dataJson?.priority
    this.title = this.dataJson?.title
  },
  methods: {
    normalize (txt) {
      this.content = txt
      // restore <br/> to \n
      this.content = this.content?.replaceAll(/<br\s*\/?>/igm, "\n")
      // reduce multiple "\n"
      this.content = this.content.replaceAll(/\n{3,}/igm, "\n\n")
      // trim all tags
      this.content = this.$utils.trimTags(this.content)
      // trim message
      this.content = this.$utils.trim(this.content)
    },
    pasted (base64) {
      this.images.indexOf(base64) === -1 && this.images.push(base64)
    },
    addEmoji (emoji) {
      const element = this.$refs.msgTextarea
      if (element && element.selectionStart) {
        const st = element.selectionStart
        const ed = element.selectionEnd
        const front = this.content.substring(0, st).trim()
        const appended = front + ' ' + emoji + ' '
        const tail = this.content.substring(ed, this.content.length).trim()
        this.content = appended + tail
        element.focus()
        this.$nextTick(() => { element.selectionEnd = appended.length })
      } else {
        this.content = this.content + ' ' + emoji
        element.focus()
      }
      this.emoji = false
    },
    openPreview () {
      this.modal(this.$createElement(AnnouncementCard, {
        props: {
          dataJson: this.announcementJson,
          channel: this.channel,
          preview: true
        }
      }), {
        size: 'xl',
        title: '預覽公告卡片'
      })
    },
    pick () {
      this.modal(this.$createElement(ImageUpload, {
        props: {
          to: '公告',
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
      const json = {
        type: "command",
        sender: this.userid,
        date: this.date(),
        time: this.time(),
        message: {
          command: 'edit_message',
          channel: this.channel,
          id: this.id,
          sender: this.userid,
          payload: this.announcementJson
        },
        channel: 'system'
      }
      this.websocket?.send(JSON.stringify(json))
      this.$emit('sent', {
        ...this.dataJson,
        title: this.title,
        content: this.content,
        priority: this.priority
      })
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
