<template lang="pug">
div
  .d-flex.small
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
    b-button.mx-1(
      @click="send"
      size="sm"
      :disabled="isEmpty"
      variant="outline-primary"
    )
      //- b-icon.mr-1(icon="cursor" v-if="!isEmpty")
      span 送出
  p.preview(v-if="!isEmpty" v-html="mdMessage")
</template>

<script>
import DOMPurify from "dompurify"
import Markd from "marked"

export default {
  props: {
    to: { type: String, required: true },
    text: { type: String, default: "" },
  },
  data: () => ({
    message: "",
  }),
  computed: {
    mdMessage() {
      if (this.$utils.empty(this.message) || !DOMPurify.sanitize) {
        return ""
      }
      return DOMPurify.sanitize(Markd(this.message.replaceAll('\n', '<br/>')))
    },
    isEmpty() { return this.$utils.empty(this.message) },
    toName() { return this.userMap[this.to] || "" },
    avatarSrc() { return `http://${this.apiHost}:${this.apiPort}/get_user_img.php?id=${this.to}_avatar&name=${this.toName}_avatar` },
  },
  methods: {
    send() {
      if (this.websocket && !this.isEmpty) {
        this.websocket.send(this.packMessage(this.message, { channel: this.to }))
        // also send to own channel to simulate talking between eachothers
        const sendToAvatar = `<span class="b-avatar-img my-auto"><img src="${this.avatarSrc}" alt="avatar" class="avatar"></span>`
        this.websocket.send(
          this.packMessage(`@${this.toName} ${sendToAvatar}<hr/> ${this.message.replaceAll('\n', '<br/>')}`, {
            channel: this.userid
          })
        )
      }
      this.message = ""
      this.$refs.msgTextarea && this.$refs.msgTextarea.focus()
      this.$emit("sent", this.message)
    },
  },
}
</script>

<style lang="scss" scoped>
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
  margin-bottom: 0rem !important;
}
</style>
