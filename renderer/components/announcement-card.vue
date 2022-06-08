<template lang="pug">
b-card.announcement-card(
  :header-border-variant="borderVariant"
  :header-bg-variant="borderVariant"
  :header-text-variant="textVariant"
  :header="header"
)
  template(#header style="position:relative"): .d-flex.font-weight-bold.align-items-center
    span(style="width: 380px").mr-auto {{ dataJson.title }}
    span.ml-1 \#{{ dataJson.id }}
  b-card-text(ref="content" v-html="content" @click="$utils.handleSpecialClick($event)")
  template(#footer): .d-flex.justify-content-between.align-items-center.small.text-muted
    span {{ dataJson.sender }}#[span.ml-1(v-if="sender !== dataJson.sender") {{ sender }}]
    b-button-group(v-if="!preview && (mine || isAdmin)", size="sm")
      b-button(
        variant="outline-primary"
        @click="edit"
      )
        b-icon.align-middle(
          icon="pencil-fill"
          title="編輯"
          scale="0.8"
        )
        span.align-middle.ml-1 編輯
      b-button(
        variant="outline-danger"
        @click="remove"
      )
        b-icon.align-middle(
          icon="x-circle"
          title="移除公告"
          scale="0.8"
        )
        span.align-middle.ml-1 刪除
    span {{ dataJson.create_datetime }}
</template>

<script>
import MessageInputEditAnnouncement from '~/components/message-input-edit-announcement.vue'
export default {
  name: 'AnnouncementCard',
  components: {
    MessageInputEditAnnouncement
    // MessageInputEditAnnouncement: () => import('~/components/message-input-edit-announcement.vue')
  },
  props: {
    dataJson: { type: Object, required: true },
    channel: { type: String, required: true },
    preview: { type: Boolean, default: false }
  },
  computed: {
    isAdmin () { return this.authority.isAdmin },
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
      if (this.$utils.empty(this.dataJson.content)) {
        return ''
      }
      let markd = this.$utils.convertMarkd(this.dataJson.content)
      if (/!\[\.+\]\(\.+\)/gm.test(markd)) {
        markd = this.$utils.convertInlineMarkd(markd)
      }
      // add open-os-explorer class for the file path uri
      return this.$utils.replaceFilepath(markd)
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
    edit () {
      this.modal(this.$createElement(MessageInputEditAnnouncement, {
        props: {
          dataJson: this.dataJson,
          channel: this.channel
        },
        on: {
          sent: (payload) => {
            this.hideModalById('message-edit-modal')
            // to tell outter board removing this message in the list
            this.$emit('edit', payload)
          }
        }
      }), {
        id: 'message-edit-modal',
        size: 'xl',
        title: '編輯公告'
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
    handleSpecialClick (event) {
      const element = event.target
      const { ipcRenderer } = require('electron')
      if (element.tagName === 'IMG' && element.src.startsWith('data:')) {
        // click on img
        ipcRenderer.invoke('open-image', {
          src: element.src,
          alt: element.alt
        })
      } else if (element.classList.contains('open-os-explorer')) {
        ipcRenderer.invoke('open-explorer', {
          path: element.innerText
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