<template lang="pug">
  div(:class="blockCss"): .msg(ref="box"): transition-group(name="list" mode="out-in")
    message(v-for="(item, idx) in list" :raw="item" :prev="list[idx - 1]" :key="`msg-${idx}`" :ref="`msg-${idx}`")
</template>

<script>
export default {
  props: {
    list: { type: Array, required: true },
  },
  computed: {
    isChat () { return !this.isAnnouncement && !this.isPersonal },
    isPersonal () { return this.userid === this.currentChannel },
    isAnnouncement () { return this.currentChannel === 'announcement' },
    blockCss () {
      if (this.isAnnouncement) {
        return 'announcement-container'
      }
      if (this.isPersonal) {
        return 'personal-container'
      }
      return 'chat-container'
    },
    messageCount () { return this.list.length }
  },
  watch: {
    messageCount (dontcare) {
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
.personal-container {
  margin: 5px;
  height: calc(81.5vh - 24px);
}

.announcement-container {
  margin: 5px;
  height: calc(89.5vh - 24px);
}

.chat-container {
  margin: 5px;
  height: calc(73.25vh - 24px);
}

.msg {
  width: 100%;
  height: 100%;
  overflow: auto;
  display: inline-block;
}
</style>