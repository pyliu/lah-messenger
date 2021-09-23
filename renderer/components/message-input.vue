<template lang="pug">
div
  .d-flex.small.align-items-end
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
    .d-flex.flex-column.mx-1
      b-button.mb-1.icon-btn(
        @click="pick"
        size="sm"
        variant="outline-success"
        title="附加圖片"
      )
        b-icon(icon="images")
      b-button.icon-btn(
        @click="send"
        size="sm"
        :disabled="isEmpty"
        variant="outline-primary"
        title="送出"
      )
        b-icon(icon="cursor")
  
  h6.my-2
    img.mt-n1(src="~/assets/img/preview_black_24dp.svg")
    span 附加圖片
  .d-flex.flex-wrap
    b-img.memento.m-1(
      v-for="(base64data, idx) in selected"
      v-if="!empty(base64data)"
      :key="`imgAttached_${idx}`"
      :src="base64data"
      thumbnail
      fluid
      title="刪除這張圖片"
      style="max-width: 122.5px"
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
    images: new Set()
  }),
  computed: {
    isEmpty () { return this.$utils.empty(this.message) },
    toName () { return this.userMap[this.to] || this.to },
    selected () { return Array.from(this.images) }
  },
  methods: {
    pick () {
      this.modal(this.$createElement('image-upload', {
        props: {
          to: this.to,
          modalId: 'image-upload-modal'
        },
        on: {
          publish: (base64data) => {
            // received publish event from image-upload component
            this.images.add(base64data)
            this.log('Got publish event, now Set size is', this.images.size)
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
        this.websocket.send(this.packMessage(this.message, { channel: this.to }))
        const replyHeader = this.packReplyHeader(this.to, this.toName, this.reply)
        // also send to own channel to simulate talking between eachothers
        this.websocket.send(
          this.packMessage(`${replyHeader} ${this.message}`, {
            channel: this.userid
          })
        )
      }
      this.message = ''
      this.$refs.msgTextarea && this.$refs.msgTextarea.focus()
      this.$emit("sent", this.message)
    }
  }
}
</script>

<style lang="scss" scoped>
.icon-btn {
  width: 48px;
  height: 32px;
  white-space: nowrap;
}
.memento:hover {
  border: 5px dashed gray;
  padding: 2px;
  cursor: pointer;
}
</style>
