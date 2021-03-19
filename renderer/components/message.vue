<template lang="pug">
.msg-item.d-flex.my-2(:class="msgClass(item)")
  p(v-if="type === 'remote'", v-html="message")
  .time.s-50.mx-1.text-muted {{ time }}
  p(v-if="mine") {{ message }}
</template>
<script>
export default {
  props: {
    raw: { type: Object, required: true },
  },
  data: () => ({}),
  asyncData(ctx) {
    return {};
  },
  computed: {
    mine() {
      return this.raw ? this.type === "mine" : false;
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
    time() {
      return this.raw ? this.raw["time"] : "";
    },
    date() {
      return this.raw ? this.raw["date"] : "";
    },
  },
  methods: {
    msgClass(item) {
      return [
        this.mine ? "justify-content-end" : "justify-content-start",
        this.type,
      ];
    },
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
    max-width: 75%;
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