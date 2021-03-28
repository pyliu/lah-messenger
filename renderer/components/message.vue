<template lang="pug">
  .mb-3
    .s-75.font-weight-bold.align-middle(v-if="!mine")
      b-avatar.my-auto.mr-1(
        v-if="['remote'].includes(type) || isAnnouncement"
        size="1.25rem"
        :src="isAnnouncement ? '/tyland.jpg' : ''"
        variant="primary"
      )
      span.mr-1 {{ sender }}
      em {{ from }}
    .d-flex.msg-item.my-1(:class="classes")
      announcement-card(
        v-if="isAnnouncement"
        :data-json="raw['message']"
      )
      p(v-else-if="!mine" v-html="message")
      .time.s-60.mx-1.text-muted {{ mtime }}
      p(v-if="mine" v-html="message")
</template>

<script>
import announcementCard from '~/components/announcement-card.vue'
export default {
  components: { announcementCard },
  props: {
    raw: { type: Object, required: true },
  },
  data: () => ({}),
  asyncData(ctx) {
    return {};
  },
  computed: {
    isAnnouncement() {
      return this.channel === 'announcement'
    },
    mine() {
      return this.raw ? process.env['USERNAME'] === this.raw["sender"] : false;
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
    mdate() {
      return this.raw ? this.raw["date"] : "";
    },
    channel() {
      return this.raw ? this.raw["channel"] : "";
    },
    classes() {
      return [
        this.mine ? "justify-content-end" : "justify-content-start",
        this.mine ? 'mine' : '',
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
    border-radius: 10px;
    background: #3c3d5a;
    color: white;
    padding: 10px;
    max-width: 90%;
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
  .time {
    display: inline-block;
    align-self: flex-end;
  }
}
</style>