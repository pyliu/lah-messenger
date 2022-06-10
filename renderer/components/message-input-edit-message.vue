<template lang="pug">
div(style="position:relative" @paste="pasteImage($event, pasted)")
  div(v-if="!empty(replyHeader)", v-html="replyHeader")
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
      b-button(
        @click="send"
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

  lah-transition(fade): .float-emoji(v-if="emoji" ref="floatEmoji")
    emoji-pickup(@click="addEmoji")

  lah-transition: .d-flex.justify-content-between.p-1.preview.mt-2(v-if="realtime && !empty(mergedMessage)" ref="preview")
    span.text-white.font-weight-bold 編輯預覽
    message.mr-2.my-message(:raw="previewJson", :preview="true")

</template>

<script>
import ImageUpload from '~/components/image-upload.vue'
import Message from '~/components/message.vue'

export default {
  name: 'MessageInputEditMessage',
  components: {
    ImageUpload,
    // to fix recursive component import
    Message: () => import('~/components/message.vue')
  },
  props: {
    /**
     * channel: "HAXXXXXXXX"
      date: "2022-06-06"
      flag: 3
      id: 425
      message: "<p>給 <span class=\"b-avatar-img\"><img src=\"http://220.1.34.75:80/get_user_img.php?id=HAXXXXXXXXX_avatar&name=XXX_avatar\" alt=\"avatar\" class=\"avatar mt-n1\"></span> 洪恆嶽 </p>\n<hr>\n👉 240GB固態硬碟.pdf</h5>\n<hr>"
      prepend: false
      remove: "{\"to\":\"HAXXXXXXXX\",\"id\":61}"
      sender: "HAXXXXXXXX"
      time: "14:17:37"
      type: "remote"
     */
    raw: { type: Object, require: true }
  },
  data: () => ({
    realtime: true,
    emoji: false,
    faces: ['😀', '😁', '😂', '😃', '😅', '😆', '👍', '👌'],
    message: '',
    images: [],
    replyHeader: '',
    cascade: null
  }),
  async fetch () {
    const userSetting = await this.$localForage.getItem('message-input-realtime')
    this.realtime = userSetting !== false
    // this.toUser = this.userMap[this.to] ? this.to : this.userid
  },
  computed: {
    id () { return this.raw?.id },
    to () { return this.raw?.channel },
    toUser () { return this.userMap[this.to] || this.to },
    randFace () { return this.faces[this.$utils._.random(this.faces.length - 1)] },
    notValid () { return this.empty(this.message) && this.empty(this.images) },
    toName () { return this.userMap[this.toUser] || this.toUser },
    modalTitle () { return `傳送圖片給 ${this.toName}` },
    mergedMessage () {
      const merged = this.empty(this.replyHeader) ? this.message : `${this.replyHeader}<hr/>${this.message}`
      if (this.empty(this.images)) {
        return merged
      }
      let imgMdText = this.images.map((base64, idx) => {
        return `![給${this.toName}${idx}](${base64})`
      }).join('\n')
      return `${merged}<hr/>${imgMdText}`
    },
    messageJson () {
      return {
        id: this.id,
        channel: this.to,
        date: this.date(),
        time: this.time(),
        // need to restore the cascade to title field
        title: this.cascade ? JSON.stringify(this.cascade) : 'dontcare',
        message: this.mergedMessage,
        prepend: false,
        sender: this.userid,
        type: "remote"
      }
    },
    previewMessage () {
      return this.$utils.convertInlineMarkd(this.$utils.convertMarkd(this.mergedMessage.replaceAll("\n***\n", '<hr/>')))
    },
    previewJson () {
      return {
        ...this.messageJson,
        message: this.previewMessage
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
    // parse cascade info if needed
    this.cascade = this.raw.remove?.startsWith('{') ? JSON.parse(this.raw.remove) : null
    this.normalize(this.raw?.message)
  },
  methods: {
    normalize (txt) {
      // keep "給 XXXX" html header in own channel
      let foundArr = /^(<p>)?給.+?(<\/p>)?<hr\/?>/igm.exec(txt)
      if (foundArr) {
        this.replyHeader = foundArr[0]
        // remove reply header
        txt = txt.replace(this.replyHeader, '')
      } else if (foundArr = /^(<p>)?@.+\s\.{3}\s/igm.exec(txt)) {
        // keep "@XXX ... " header in chat channel
        this.replyHeader = this.$utils.trimTags(foundArr[0])
      }
      // restore <br/> to \n
      this.message = txt?.replaceAll(/<br\s*\/?>/igm, "\n")
      // trim all tags
      this.message = this.$utils.trimTags(this.message)
      // add divider for the "@XXX ... "
      this.message = this.message.replaceAll(/^@.+\s\.{3}\s/igm, '')
      // reduce multiple "\n"
      this.message = this.message.replaceAll(/\n{3,}/igm, "\n\n")
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
      // const Message = import('~/components/message.vue')
      this.modal(this.$createElement(Message, {
        props: {
          raw: this.previewJson,
          preview: true
        }
      }), {
        size: 'xl',
        title: '預覽'
      })
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
      const json = {
        type: "command",
        sender: this.userid,
        date: this.date(),
        time: this.time(),
        message: {
          command: 'edit_message',
          channel: this.to,
          id: this.id,
          sender: this.userid,
          payload: this.messageJson,
          // in private channel, it needs to edit the pm as well; parsed json expect: { to: 'HAXXXX', id: xxxx }
          cascade: this.cascade || ''
        },
        channel: 'system'
      }
      this.websocket?.send(JSON.stringify(json))
      this.$emit('sent', {...this.raw, message: this.message})
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
