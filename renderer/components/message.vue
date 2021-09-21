<template lang="pug">
  .mb-1
    //- show date if the message has previous days' message
    .d-flex.msg-item.justify-content-center.system.date(
      v-if="showMdate"
    ): p(v-html="mdate")

    .s-75.font-weight-bold.align-middle(
      v-if="!mine && !system"
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
        :data-json="raw['message']"
      )

      //- remote or system message
      p(v-else-if="!mine" v-html="message")

      //- timestamp for the message
      .time.s-60.mx-1.text-muted.text-right(v-if="!system")
        b-icon.mr-1.hover(
          v-if="mine"
          icon="x-circle"
          variant="danger"
          title="移除這則訊息"
          scale="1.5"
          @click="remove"
        )
        b-icon.hover(v-if="!isAnnouncement && !isMyChannel && !mine" icon="arrow-return-left" flip-v @click="emitReply" title="回覆此訊息")
        div {{ mtime }}

      //- my message
      p(v-if="mine" v-html="message")

</template>

<script>
import announcementCard from '~/components/announcement-card.vue'
export default {
  components: { announcementCard },
  props: {
    raw: { type: Object, required: true },
    prev: { type: Object, default: undefined }
  },
  data: () => ({}),
  asyncData(ctx) {
    return {}
  },
  computed: {
    showMdate() { return this.prevMdate !== this.mdate },
    isAnnouncement() { return this.currentChannel.startsWith('announcement') },
    isMyChannel() { return this.currentChannel === this.userid },
    mine() { return this.raw ? this.userid === this.senderId : false },
    system() { return this.raw ? 'system' === this.sender : false },
    id() { return this.raw?.id },
    type() { return this.raw?.type },
    message() { return this.raw?.message },
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
        this.mine ? 'justify-content-end' : this.system ? 'justify-content-center' : 'justify-content-start',
        this.mine ? 'mine' : this.system ? 'system' : '',
      ]
    },
    avatarSrc () { return `http://${this.apiHost}:${this.apiPort}/get_user_img.php?id=${this.raw["sender"]}_avatar&name=${this.sender}_avatar` }
  },
  methods: {
    avatarClick (event) {
      event.stopPropagation()
      this.modal(this.$createElement('user-card', {
        props: {
          id: this.raw.sender,
          name: this.sender
        }
      }), {
        title: `${this.sender}`,
        size: 'xl'
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
      const jsonString = JSON.stringify({
        type: "command",
        sender: this.userid,
        date: this.date(),
        time: this.time(),
        message: JSON.stringify({
          command: 'remove_message',
          channel: this.channel,
          id: this.id
        }),
        channel: 'system'
      })
      this.websocket.send(jsonString)
    }
  }
}
</script>

<style lang="scss" scoped>
.hover:hover {
  font-size: .85rem;
}
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
      background: rgb(129, 240, 148);
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
    svg {
      cursor: pointer;
    }
  }
}
</style>