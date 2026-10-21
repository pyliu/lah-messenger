<template lang="pug">
.float-history(v-if="open && list.length" ref="box")
  .small.text-muted.px-2.py-1.border-bottom ⬆⬇ 選擇最近送出的訊息，Enter 填入，Esc 關閉
  .history-item(
    v-for="(h, i) in list"
    :key="`msg_history_${i}`"
    :class="{ active: i === index }"
    :title="h"
    @mousedown.prevent="$emit('choose', i)"
    @mouseenter="$emit('hover', i)"
  ) {{ h }}
</template>

<script>
export default {
  name: 'InputHistory',
  props: {
    open: { type: Boolean, default: false },
    list: { type: Array, default: () => [] },
    index: { type: Number, default: 0 }
  },
  watch: {
    index () {
      this.$nextTick(this.scrollActive)
    },
    open () {
      this.$nextTick(this.scrollActive)
    }
  },
  methods: {
    scrollActive () {
      const active = this.$refs.box && this.$refs.box.querySelector('.history-item.active')
      active && active.scrollIntoView && active.scrollIntoView({ block: 'nearest' })
    }
  }
}
</script>

<style lang="scss" scoped>
.float-history {
  position: absolute;
  bottom: calc(100% + 4px);
  left: 0;
  width: 100%;
  max-height: 220px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #ced4da;
  border-radius: 8px;
  z-index: 1060;
  box-shadow: 0 -4px 14px rgba(0, 0, 0, 0.18);
  .history-item {
    padding: 4px 10px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    &.active {
      background: #007bff;
      color: #fff;
    }
  }
}
</style>
