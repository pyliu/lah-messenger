<template lang="pug">
  .msg-container: .msg(ref="box"): transition-group(name="list" mode="out-in")
    message(v-for="(item, idx) in list" :raw="item" :key="`msg-${idx}`" :ref="`msg-${idx}`")
</template>

<script>
export default {
  props: {
    list: { type: Array, required: true },
  },
  watch: {
    list (dontcare) {
      // watch list to display the latest message
      // Vue VDOM workaround ... to display the last message
      this.$nextTick(() => {
        if (this.$refs.box) {
          this.$refs.box.scrollTop = this.$refs.box.scrollHeight
        }
      })
    }
  },
};
</script>

<style lang="scss" scoped>
.msg-container {
  margin: 5px;
  height: 81.5vh;
}

.msg {
  width: 100%;
  height: 100%;
  overflow: auto;
  display: inline-block;
}
</style>