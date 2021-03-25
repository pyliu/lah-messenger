<template lang="pug">
  div
    div.s-60(v-if="!mine") {{ who }} ( {{ ip }} )
    .msg-item.d-flex.my-2(:class="classes")
      announcement-card(
        v-if="type === 'announcement'"
        :data-json="raw['message']"
      )
      p(v-else-if="!mine" v-html="message")
      .time.s-60.mx-1.text-muted {{ time }}
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
    mine() {
      return this.raw ? this.type === "mine" || this.type.startsWith("@") : false;
    },
    type() {
      return this.raw ? this.raw["type"] : "";
    },
    message() {
      return this.raw ? this.raw["message"] : "";
    },
    who() {
      return this.raw ? this.raw["who"] : "";
    },
    ip() {
      return this.raw ? this.raw["ip"] : "";
    },
    time() {
      return this.raw ? this.raw["time"] : "";
    },
    date() {
      return this.raw ? this.raw["date"] : "";
    },
    classes() {
      return [
        this.mine ? "justify-content-end" : "justify-content-start",
        this.type.startsWith('@') || this.type === 'mine' ? 'mine' : '',
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
    padding: 2px 12px;
    margin: 0 0 2px 0;
    max-width: 90%;
    text-align: left;
    box-sizing: border-box;
  }

  &.mine {
    p {
      background: rgb(2, 182, 32);
      color: white;
    }
  }
  .time {
    display: inline-block;
    align-self: flex-end;
  }
}
</style>