<template lang="pug">
  .mb-1
    //- show date if the message has previous days' message
    .d-flex.msg-item.justify-content-center.system.date(
      v-if="showMdate && id > 0"
    ): p(v-html="mdate")

    .s-75.font-weight-bold.align-middle(
      v-if="!myMessage && !system"
      @click="avatarClick($event)"
      :style="{ cursor: 'pointer' }"
      title="顯示使用者卡片"
    )
      b-avatar.my-auto.mr-1(
        v-if="['remote'].includes(type) || isAnnouncement"
        :src="isAnnouncement ? '/tyland.jpg' : this.avatarSrc"
        size="1.25rem"
        variant="primary"
        button
      )
      span.mr-1 {{ sender }}
      em {{ from }}

    .d-flex.msg-item.my-1(:class="classes")

      //- special card message for announcement
      announcement-card(
        v-if="isAnnouncement"
        :data-json="announcementPayload"
        :channel="channel"
        :message-id="id"
      )

      //- remote or system message
      p(ref="remoteMessage" v-else-if="!myMessage" v-html="message" @click="handleImgClick($event)")

      //- timestamp for the message
      .time.s-60.mx-1.text-muted.text-right(v-if="!system")
        b-icon.align-middle.mr-1.readIcon(
          v-if="isRead"
          icon="check"
          :variant="myMessage ? 'success' : 'light'"
          title="已讀取"
        )
        b-icon.mr-1.clickableIcon(
          v-if="messageRemovable"
          icon="x-circle"
          variant="danger"
          title="移除這則訊息"
          scale="1.5"
          @click="remove"
        )
        b-icon.clickableIcon(
          v-if="!isAnnouncement && !myMessage && userMap[senderId]"
          icon="reply-fill"
          title="回覆此訊息"
          font-scale="1.5"
          flip-h
          @click="isMyChannel ? reply() : emitReply()"
        )
        div(v-if="!isAnnouncement") {{ mtime }}

      //- my message
      p(ref="myMessage" v-if="myMessage" v-html="message" @click="handleImgClick($event)")

</template>

<script>
import announcementCard from '~/components/announcement-card.vue'
import UserCard from '~/components/user-card.vue'
import MessageInput from '~/components/message-input.vue'

export default {
  components: { announcementCard, UserCard, MessageInput },
  props: {
    /** example raw json data from my channel
      channel: "HA1001XXXX"
      date: "2021-10-19"
      flag: 3
      id: 152
      message: "<p>給 <span class="b-avatar-img"><img src="http://XXX.XXX.XXX.XXX:XX/get_user_img.php?id=HAXXXXXX_avatar&name=XXX_avatar" alt="avatar" class="avatar mt-n1"></span> XXX  <hr style="margin:5px"/></p>↵<h3 id="-z-1101019-">👉 ... </h3>"
      prepend: false
      remove: "{"to":"HA03XXXX","id":13}"
      sender: "HA1001XXXX"
      time: "09:26:40"
      type: "remote"
     */
    raw: { type: Object, required: true },
    prev: { type: Object, default: undefined }
  },
  data: () => ({}),
  computed: {
    cascadeInfo () {
      try {
        return JSON.parse(this.raw?.remove)
      } catch (e) {
        return undefined
      }
    },
    isCascadeMessage () { return (this.raw.flag & 1) === 1 && typeof this.cascadeInfo === 'object' },
    isRead () { return (this.raw.flag & 2) === 2 },
    announcementPayload () { return this.raw?.message },
    isAnnouncement() { return typeof this.announcementPayload === 'object' },
    myAnnouncement () { return this.isAnnouncement && this.announcementPayload.sender === this.userid },

    showMdate() { return this.prevMdate !== this.mdate },
    isMyChannel() { return this.currentChannel === this.userid },
    myMessage() { return this.userid === this.senderId },
    system() { return 'system' === this.sender },
    id() { return this.raw?.id },
    type() { return this.raw?.type },
    message() { return this.$utils.emojify(this.raw?.message) },
    senderId() { return this.raw?.sender },
    sender() { return this.userMap[this.senderId] || this.senderId },
    from() { return this.raw?.ip },
    mtime() { return this.raw?.time },
    channel() { return this.raw?.channel },
    prevMdate() {
      if (this.prev) {
        // announcement card date is inside the message
        if (this.isAnnouncement) {
          return this.prev?.message?.create_datetime?.split(' ')[0]
        }
        return this.prev?.date
      }
      return ''
    },
    mdate() {
      // announcement card date is inside the message
      if (this.isAnnouncement) {
        return this.raw?.message?.create_datetime?.split(' ')[0]
      }
      return this.raw?.date
    },
    classes() {
      return [
        this.myMessage ? 'justify-content-end' : this.system ? 'justify-content-center' : 'justify-content-start',
        this.myMessage ? 'mine' : this.system ? 'system' : '',
      ]
    },
    avatarSrc () { return `${this.apiQueryUrl}/get_user_img.php?id=${this.raw["sender"]}_avatar&name=${this.sender}_avatar` },
    replyTitle () {
      const clean = this.message.replace(/(<([^>]+)>)/gi, '')
      return clean.replace(/%[A-F\d]{2}/g, 'U').length > 20 ? `${clean.substring(0, 20)} ... ` : clean
    },
    announcementRemovable () { return this.myAnnouncement },
    messageRemovable () {
      if (this.id < 1) { return false }
      if (this.isMyChannel && this.myMessage) { return true }
      const nowTs = +new Date()
      const msgTs = +new Date(`${this.raw.date} ${this.raw.time}`)
      const offset = nowTs - msgTs
      // my message and wthin a day
      return this.myMessage && offset <= 86400000
    }
  },
  created () {
    this.sendReadCommand = this.$utils.debounce(() => {
      if (this.windowVisible && this.connected && this.channel) {
        // not read and can find sender user
        if (!this.isRead && this.sender !== this.serderId) {
          const json = {
            type: "command",
            sender: this.userid,
            date: this.date(),
            time: this.time(),
            channel: 'system'
          }
          json.message = {
            command: 'set_read',
            channel: this.channel,
            id: this.id,
            flag: this.raw.flag,
            sender: this.userid,
            cascade: this.isMyChannel // need to send set read message to the sender to set the message in his channel
          }
          this.websocket.send(JSON.stringify(json))
        }
      } else {
        this.timeout(() => this.sendReadCommand(), 3000)
      }
    }, 15000)
  },
  mounted () {
    this.$refs.remoteMessage && this.sendReadCommand()
    this.$refs.myMessage && this.checkReadCommand()
  },
  methods: {
    sendReadCommand () {/* placeholder for debouncing */},
    checkReadCommand () {
      if (this.isCascadeMessage && !this.isRead) {
        const json = {
          type: "command",
          sender: this.userid,
          date: this.date(),
          time: this.time(),
          channel: 'system'
        }
        json.message = {
          command: 'check_read',
          channel: this.cascadeInfo.to,
          id: this.cascadeInfo.id,
          sender: this.userid,
          senderChannelMessageId: this.id,
          senderChannelMessageFlag: this.raw?.flag || 0
        }
        this.connected && this.websocket.send(JSON.stringify(json))
        // in case remote not read the message, checks again after 20s
        this.timeout(() => this.checkReadCommand(), 20000)
      }
    },
    handleImgClick (event) {
      const element = event.target
      if (element.tagName === 'IMG') {
        if (element.src.startsWith('data:')) {
          // not click on avatar img
          const { ipcRenderer } = require('electron')
          ipcRenderer.invoke('open-image', {
            src: element.src,
            alt: element.alt
          })
        } else if (this.$utils.$(element).hasClass('avatar') && this.cascadeInfo) {
          this.modal(this.$createElement(UserCard, { props: { id: this.cascadeInfo.to } }), {
            title: this.cascadeInfo.to,
            size: 'xl'
          })
        } 
      }
    },
    avatarClick (event) {
      event.stopPropagation()
      this.modal(this.$createElement(UserCard, {
        props: {
          id: this.raw.sender,
          name: this.sender
        }
      }), {
        title: `${this.sender}`,
        size: 'xl'
      })
    },
    reply () {
      this.modal(this.$createElement(MessageInput, {
        props: {
          text: this.message,
          to: this.senderId,
          reply: this.replyTitle || ' ... '
        },
        on: {
          sent: () => { this.hideModalById('message-reply-modal') }
        }
      }), {
        id: 'message-reply-modal',
        size: 'xl',
        title: `回覆：${this.sender} - ${this.replyTitle || ' ... '}`
      })
    },
    emitReply () {
      this.$emit('reply', this.raw)
    },
    remove () {
      this.confirm('刪除本則訊息?').then((YN) => {
        if (YN) {
          // TODO: send request to ws to remvoe the message from channel
          this.sendRemoveMessage()
          // to tell outter board removing this message in the list
          this.$emit('remove', this.raw)
        }
      })
    },
    sendRemoveMessage () {
      const json = {
        type: "command",
        sender: this.userid,
        date: this.date(),
        time: this.time(),
        message: JSON.stringify({
          command: 'remove_message',
          channel: this.channel,
          id: this.id,
          // in my channel, it needs to remove the pm as well; parsed json expect: { to: 'HAXXXX', id: xxxx }
          cascade: this.currentChannel === this.userid && this.raw.flag === 1 ? JSON.parse(this.raw.remove) : ''
        }),
        channel: 'system'
      }
      this.websocket.send(JSON.stringify(json))
    }
  }
}
</script>

<style lang="scss" scoped>
.msg-item {
  position: relative;
  overflow: hidden;

  p {
    display: inline-block;
    border-radius: 5px;
    background: #e6e9e9;
    color: rgb(10, 10, 10);
    padding: 5px;
    max-width: 85%;
    text-align: left;
    box-sizing: border-box;
    margin-bottom: 0rem !important;
  }

  &.mine {
    p {
      background: rgb(214, 247, 220);
      color: rgb(0, 0, 0);
      margin-bottom: 0rem !important;
    }
  }
  &.system {
    p {
      text-align: center;
      font-weight: bold;
      padding: 5px 10px 5px 10px;
      border-radius: 10px;
      background: #e9ebec;
      color: #2e2e2e;
      font-size: .75rem;
      max-width: 95%;
    }
    margin-top: .25rem;
    margin-bottom: 0.5rem;
  }
  &.date {
    p {
      width: 100%;
      padding: 5px 15px 5px 15px;
    }
  }
  .time {
    display: inline-block;
    align-self: flex-end;
    .clickableIcon {
      cursor: pointer;
      transition: all .5s;
      z-index: 1002;
      &:hover {
        font-size: .75rem;
        font-weight: bold;
        color: rgb(0, 81, 255);
      }
    }
    .readIcon {
      font-size: 1.5rem;
      font-weight: bold;
    }
  }
}
</style>
