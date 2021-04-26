<template lang="pug">
  .mb-1
    //- show date if the message has previous days' message
    .d-flex.msg-item(
      v-if="showMdate"
      :class="['justify-content-center', 'system', 'date']"
    ): p(v-html="mdate")

    .s-75.font-weight-bold.align-middle(v-if="!mine && !system")
      b-avatar.my-auto.mr-1(
        v-if="['remote'].includes(type) || isAnnouncement"
        size="1.25rem"
        :src="isAnnouncement ? '/tyland.jpg' : ''"
        variant="primary"
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
      .time.s-60.mx-1.text-muted(v-if="!system") {{ mtime }}

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
    return {};
  },
  computed: {
    showMdate() {
      return this.prevMdate !== this.mdate
    },
    isAnnouncement() {
      return this.currentChannel.startsWith('announcement')
    },
    mine() {
      return this.raw ? this.userid === this.sender : false;
    },
    system() {
      return this.raw ? 'system' === this.sender : false;
    },
    id() {
      return this.raw ? this.raw["id"] : "";
    },
    type() {
      return this.raw ? this.raw["type"] : "";
    },
    message() {
      return this.raw ? this.raw["message"] : "";
    },
    sender() {
      return this.raw ? this.raw["sender"] : "";
    },
    from() {
      return this.raw ? this.raw["ip"] : "";
    },
    mtime() {
      return this.raw ? this.raw["time"] : "";
    },
    prevMdate() {
      if (this.prev) {
        return this.prev['date']
      }
      return ''
    },
    mdate() {
      return this.raw ? this.raw["date"] : "";
    },
    channel() {
      return this.raw ? this.raw["channel"] : "";
    },
    classes() {
      return [
        this.mine ? 'justify-content-end' : this.system ? 'justify-content-center' : 'justify-content-start',
        this.mine ? 'mine' : this.system ? 'system' : '',
      ];
    }
  },
};
</script>

<style lang="scss" scoped>
.msg-item {
  position: relative;
  overflow: hidden;

  p {
    display: inline-block;
    border-radius: 5px;
    background: #d3d4d4;
    color: rgb(10, 10, 10);
    padding: 5px;
    max-width: 85%;
    text-align: left;
    box-sizing: border-box;
    margin-bottom: 0rem !important;
  }

  &.mine {
    p {
      background: rgb(2, 182, 32);
      color: white;
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
  }
}
</style>