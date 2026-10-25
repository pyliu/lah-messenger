/**
 * @file home-input.js
 * @description 首頁底部訊息輸入、貼圖、附件上傳、草稿預覽與訊息發送 Mixin
 */
import trim from 'lodash/trim'
import ImageUpload from '~/components/image-upload.vue'

export default {
  components: {
    ImageUpload
  },

  data: () => ({
    emoji: false,
    image: null,
    inputText: '',
    inputImages: [],
    uploadFiles: []
  }),

  computed: {
    valid () {
      return !this.empty(trim(this.inputText)) || !this.empty(this.inputImages) || this.uploadFiles.length > 0
    },

    markdImages () {
      let imgMdText = this.inputImages
        .map((base64, idx) => `![preview-${idx}](${base64})`)
        .join('\n')
      if (!this.empty(this.inputText) && !this.empty(imgMdText)) {
        imgMdText = `\n\n***\n\n${imgMdText}`
      }
      return imgMdText
    },

    markdMessage () {
      if (this.empty(this.inputText) && this.empty(this.inputImages)) return ''
      const protectedText = this.protectLocalPath(this.inputText)
      return this.$utils.convertMarkd(`${protectedText} ${this.markdImages}`)
    },

    messagePreviewJson () {
      return {
        id: 0,
        channel: this.to,
        date: this.date(),
        time: this.time(),
        message: this.markdMessage,
        prepend: false,
        sender: this.adAccount,
        type: 'mine'
      }
    }
  },

  methods: {
    protectLocalPath (text) {
      if (!text) return ''
      return String(text)
        .replace(/(?<!`)(["'])(\\\\[a-zA-Z0-9_.-]+\\[^\r\n]+?|[a-zA-Z]:\\[^\r\n]+?)\1(?!`)/g, '`$2`')
        .replace(/(?<!`)(\\\\[a-zA-Z0-9_.-]+\\[^\s`<>，。！？；：、）)」』》】\]},;!?]+|[a-zA-Z]:\\[^\s`<>，。！？；：、）)」』》】\]},;!?]+)(?!`)/g, '`$1`')
    },

    scrollToBottom () {
      this.$nextTick(() => {
        const el = this.$refs.msgBoard?.$el
        if (!el) return
        let start = null
        const step = (timestamp) => {
          if (!start) start = timestamp
          if (el) el.scrollTop = el.scrollHeight
          if (timestamp - start < 300) window.requestAnimationFrame(step)
        }
        window.requestAnimationFrame(step)
      })
    },

    clear () {
      this.inputText = ''
      this.inputImages = []
      this.uploadFiles = []
    },

    pickAttachment () {
      this.$refs.fileInput?.click()
    },

    handleFileChange (e) {
      const files = Array.from(e.target.files || [])
      for (const f of files) {
        const check = this.validateAttachmentFile(f)
        if (!check.valid) {
          this.showAttachmentError(f.name, check.message)
          return
        }
        this.uploadFiles.push(f)
      }
      e.target.value = ''
    },

    removeUploadFile (idx) {
      this.uploadFiles.splice(idx, 1)
    },

    pasted (base64) {
      !this.inputImages.includes(base64) && this.inputImages.push(base64)
    },

    onWindowPaste (event) {
      const clipboardData = event?.clipboardData || event?.originalEvent?.clipboardData || (typeof window !== 'undefined' ? window.clipboardData : null)
      if (!clipboardData) return
      const items = clipboardData.items || []
      for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf('image') !== -1) {
          event.preventDefault()
          this.pasteImage(event, this.pasted)
          break
        }
      }
    },

    removeInoutImage (base64data) {
      const index = this.inputImages.indexOf(base64data)
      if (index > -1) this.inputImages.splice(index, 1)
    },

    emojiPickup () {
      this.emoji = !this.emoji
    },

    addEmoji (emoji) {
      this.emoji = false
      const element = this.$refs.textarea
      if (element && element.selectionStart) {
        const appended =
          this.inputText.substring(0, element.selectionStart).trim() +
          ' ' +
          emoji +
          ' '
        this.inputText =
          appended +
          this.inputText
            .substring(element.selectionEnd, this.inputText.length)
            .trim()
        element.focus()
        this.$nextTick(() => {
          element.selectionEnd = appended.length
        })
      } else {
        this.inputText = this.inputText + ' ' + emoji
        element.focus()
      }
    },

    pick () {
      this.modal(
        this.$createElement(ImageUpload, {
          props: { to: this.currentChannel, modalId: 'image-upload-modal' },
          on: {
            publish: (b64) =>
              this.sendImage(b64, '上傳圖片', this.currentChannel)
          }
        }),
        { id: 'image-upload-modal', size: 'xl', title: '直接傳送圖片' }
      )
    },

    reply (raw) {
      const sender = this.userMap[raw.sender] || raw.sender
      const hrIdx = raw.message?.indexOf('<hr>')
      const text =
        hrIdx === -1 ? raw.message : raw.message.substring(hrIdx + 4)
      const tmp = document.createElement('DIV')
      tmp.innerHTML = `@${sender} ${text}`
      let innerText = tmp.textContent || tmp.innerText || ''
      if (this.$utils.length(innerText) > 20) {
        innerText = innerText.substring(0, 20) + ' ... '
      }
      this.inputText = `${innerText}\n\n***\n\n`
      this.$nextTick(() => {
        if (this.$refs.textarea?.$el) {
          this.$refs.textarea.$el.scrollTop = 999999
        }
        this.$refs.textarea?.focus()
      })
    },

    send () {
      if (!this.valid) return
      if (!this.websocket || this.websocket.readyState !== 1) {
        this.setConnectText('連線不穩定，正在自動修復...')
        this.connect()
        return
      }
      const hasFiles = this.uploadFiles.length > 0
      const filesToUpload = hasFiles ? [...this.uploadFiles] : []
      if (hasFiles) {
        this.$store.commit('addPendingAttachmentUpload', {
          channel: this.currentChannel,
          files: filesToUpload
        })
        this.uploadFiles = []
        if (this.empty(this.inputText) && this.empty(this.inputImages)) {
          this.inputText = filesToUpload.map((f) => f.name).join(', ')
        }
      }
      this.pushHistory(this.inputText)
      if (this.sendTo(this.markdMessage, { channel: this.currentChannel })) {
        this.clear()
      }
      this.$refs.textarea?.focus()
    },

    sendTo (msg, opts = {}) {
      if (this.$utils.empty(msg)) return false

      if (!this.websocket || this.websocket.readyState !== 1) {
        this.setConnectText('連線不穩定，正在自動修復...')
        this.connect()
        return false
      }

      try {
        this.websocket.send(
          this.packMessage(msg, { channel: this.currentChannel, ...opts })
        )
        return true
      } catch (e) {
        this.err('WS 發送失敗', e)
        return false
      }
    }
  }
}
