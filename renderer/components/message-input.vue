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
        @click="upload"
        size="sm"
        variant="outline-success"
        title="附加圖片"
        disabled
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
  //- .preview(v-if="!isEmpty" v-html="mdMessage")
</template>

<script>
export default {
  props: {
    to: { type: String, required: true },
    text: { type: String, default: '' },
    reply: { type: String, default: '' }
  },
  data: () => ({
    message: '',
  }),
  computed: {
    isEmpty () { return this.$utils.empty(this.message) },
    toName () { return this.userMap[this.to] || this.to },
    avatarSrc () { return `${this.apiQueryUrl}/get_user_img.php?id=${this.to}_avatar&name=${this.toName}_avatar` },
  },
  methods: {
    send () {
      if (this.websocket && !this.isEmpty) {
        this.websocket.send(this.packMessage(this.message, { channel: this.to }))
        const replyHeader = this.packReplyHeader(this.to, this.toName)
        // also send to own channel to simulate talking between eachothers
        this.websocket.send(
          this.packMessage(`${replyHeader} ${this.empty(this.reply) ? '' : `- ${this.reply}`} ${this.message}`, {
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
.preview {
  display: inline-block;
  border-radius: 5px;
  background: #e6e9e9;
  color: rgb(10, 10, 10);
  padding: 5px;
  width: 85%;
  text-align: left;
  box-sizing: border-box;
  margin-top: 1rem;
}
</style>
