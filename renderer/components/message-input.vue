<template lang="pug">
div
  b-textarea(
    ref="msgTextarea"
    v-model="message"
    debounce="200"
    placeholder="... 回復內容 ...",
    size="sm"
    rows="5"
    no-resize
    no-auto-shrink
    autofocus
  )
  
  .my-2.d-flex.align-items-center.justify-content-end
    b-button(
      @click="send"
      size="sm"
      :disabled="isEmpty"
      :variant="isEmpty ? 'outline-primary' : 'primary'"
      title="送出"
    ): b-icon(icon="cursor" rotate="45")
    b-button.ml-1(
      @click="pick"
      size="sm"
      variant="success"
      title="附加圖片"
    ): b-icon(icon="images")
  .d-flex.flex-wrap
    b-img.memento.m-1(
      v-for="(base64data, idx) in images"
      :key="`imgAttached_${idx}`"
      :src="base64data"
      thumbnail
      fluid
      title="刪除這張圖片"
      style="width: 138.5px"
    )
</template>

<script>
import ImageUpload from '~/components/image-upload.vue'
export default {
  components: { ImageUpload },
  props: {
    to: { type: String, required: true },
    text: { type: String, default: '' },
    reply: { type: String, default: '' }
  },
  data: () => ({
    message: '',
    images: []
  }),
  computed: {
    isEmpty () { return this.empty(this.message) && this.empty(this.images) },
    toName () { return this.userMap[this.to] || this.to }
  },
  methods: {
    pick () {
      this.modal(this.$createElement('image-upload', {
        props: {
          to: this.to,
          modalId: 'image-upload-modal'
        },
        on: {
          publish: (base64EncodedData) => {
            // received publish event from image-upload component and add latestimageMemento to Set
            this.images.push(base64EncodedData)
          }
        }
      }), {
        id: 'image-upload-modal',
        size: 'xl',
        title: `傳送圖片給 ${this.toName}`
      })
    },
    send () {
      if (this.websocket && !this.isEmpty) {
        let imgMdText = this.images.map((base64, idx) => {
          return `![給${this.toName}${idx}](${base64})`
        }).join('<hr style="margin:5px"/>')
        if (!this.empty(imgMdText)) {
          imgMdText = `<hr style="margin:5px"/> ${imgMdText}`
        }
        // send to target
        this.websocket.send(this.packMessage(`${this.message} ${imgMdText}`, { channel: this.to }))
        const replyHeader = this.packReplyHeader(this.to, this.toName, this.reply)
        // also send to own channel to simulate talking between eachothers
        this.websocket.send(
          this.packMessage(`${replyHeader} ${this.message} ${imgMdText}`, {
            channel: this.userid
          })
        )
      }
      this.$emit("sent", this.message)
      this.message = ''
      this.$refs.msgTextarea && this.$refs.msgTextarea.focus()
    }
  }
}
</script>

<style lang="scss" scoped>
.memento:hover {
  border: 5px dashed gray;
  padding: 2px;
  cursor: pointer;
}
</style>
