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
    isPersonal () { return process.env['USERNAME'] === this.currentChannel },
    isAnnouncement () { return this.currentChannel === 'announcement' },
    blockCss () {
      if (this.isAnnouncement) {
        return 'announcement-container'
      }
      if (this.isPersonal) {
        return 'personal-container'
      }
      return 'chat-container'
    }
  },
  watch: {
    // userid (val) { concole.log('userid', val) },
    // isAnnouncement (val) { console.log('announcement', val) },
    // isPersonal (val) { console.log('personal', val) },
    // isChat (val) { console.log('chat', val) },
    // blockCss (val) { console.log('css', val) },
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
.personal-container {
  margin: 5px;
  height: 81.5vh;
}

.announcement-container {
  margin: 5px;
  height: 89.5vh;
}

.chat-container {
  margin: 5px;
  height: 73.25vh;
}

.msg {
  width: 100%;
  height: 100%;
  overflow: auto;
  display: inline-block;
}
</style>