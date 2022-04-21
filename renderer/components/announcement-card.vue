<template lang="pug">
  b-card.announcement-card(
    :header-border-variant="borderVariant"
    :header-bg-variant="borderVariant"
    :header-text-variant="textVariant"
    :header="header"
  )
    template(#header style="position:relative"): .d-flex.font-weight-bold.align-items-center
      span(style="width: 380px").mr-auto {{ dataJson.title }}
      b-icon.ml-1.removeIcon(
        v-if="mine && dataJson.id > 0"
        icon="x-circle"
        title="移除這則公告"
        scale="1.25"
        @click="remove"
      )
      span.ml-1 \#{{ dataJson.id }}
    b-card-text(ref="content" v-html="content" @click="handleImgClick($event)")
    template(#footer): .d-flex.justify-content-between.small.text-muted
      span {{ dataJson.sender }}#[span.ml-1(v-if="sender !== dataJson.sender") {{ sender }}]
      span {{ dataJson.create_datetime }}
</template>

<script>
import isEmpty from 'lodash/isEmpty'
export default {
  props: {
    dataJson: { type: Object, required: true },
    channel: { type: String, required: true }
  },
  computed: {
    mine () { return this.$utils.equal(this.dataJson.sender, this.userid) },
    header () { return this.dataJson.title },
    borderVariant () {
      const priority = parseInt(this.dataJson.priority)
      switch (priority) {
        case 0:
          return 'danger'
        case 1:
          return 'warning'
        case 2:
          return 'info'
        default:
          return 'secondary'
      }
    },
    textVariant () {
      const priority = parseInt(this.dataJson.priority)
      switch (priority) {
        case 1:
          return 'black'
        case 0:
        case 2:
        default:
          return 'white'
      }
    },
    sender () { return this.userMap[this.dataJson.sender] || this.dataJson.sender },
    content () {
      if (isEmpty(this.dataJson.content)) {
        return ''
      }
      const markd = this.$utils.convertMarkd(this.dataJson.content)
      if (/!\[\.+\]\(\.+\)/gm.test(markd)) {
        return this.$utils.convertInlineMarkd(markd)
      }
      return markd
    }
  },
  methods: {
    remove () {
      this.confirm(`刪除公告 - 「${this.dataJson.title}」？`).then((YN) => {
        if (YN) {
          // TODO: send request to ws to remvoe the message from channel
          this.sendRemoveMessage()
          // to tell outter board removing this message in the list
          this.$emit('remove', this.dataJson)
        }
      })
    },
    sendRemoveMessage () {
      const jsonString = JSON.stringify({
        type: "command",
        sender: this.userid,
        date: this.date(),
        time: this.time(),
        message: JSON.stringify({
          command: 'remove_message',
          channel: this.channel,
          id: this.dataJson.id
        }),
        channel: 'system'
      })
      this.websocket && this.websocket.send(jsonString)
    },
    handleImgClick (event) {
      const element = event.target
      if (element.tagName === 'IMG' && element.src.startsWith('data:')) {
        // click on img
        const { ipcRenderer } = require('electron')
        ipcRenderer.invoke('open-image', {
          src: element.src,
          alt: element.alt
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.removeIcon {
  transition: all .5s;
  z-index: 1001;
  cursor: pointer;
  font-weight: 500;
  color: white;
  position: absolute;
  right: 2px;
  top: 2px;
  &:hover {
    font-size: 1.25rem;
    font-weight: 900;
    color: red;
  }
}
</style>