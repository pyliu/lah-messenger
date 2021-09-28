<template lang="pug">
  .d-flex.flex-wrap.justify-content-between
    //- b-button-group(
    //-   v-for="(chunk, oidx) in emojis"
    //-   :key="`chunk_${oidx}`"
    //-   :size="size"
    //- )
    b-button.border-0(
      v-for="(thisEmoji, iidx) in emojis"
      :key="`emoji_${iidx}`"
      variant="outline-light"
      size="lg"
      @click="$emit('click', thisEmoji)"
    ) {{ thisEmoji }}
</template>

<script>
const nodeEmoji = require('node-emoji')
export default {
  props: {
    size: { type: String, default: 'md' }
  },
  data: () => ({
    emoji: '😃 😍 😝 😱 😵 😭 👋 👌 👍 👎 👏 💯 💤 ❗ ⚠️ ⛔ 😰 🤣 ☕ 😠 ❓ 😡 🙏 👀 🤬 😁 😆 😅 😂 💗 💛 💚 💔 😎 🤡 🔴 🟢 🟡 😏 😐 😞 😟 😖 🥱 😤 😮 😨 😷 🤕 🤢 🤧 🥵 🥶 💩 🤝 🤞 ✌ 👈 👉 👆 👇 ☝ ✋ 🤚 🖐 🤙 💪 🦾 🙋 🙋‍♂️ ㊗️'
  }),
  computed: {
    emojis () { return this.$utils._.compact([nodeEmoji.random().emoji, ...this.emoji.split(/\s+/)]) }
  },
  mounted() {
    
  }
};
</script>

<style lang="scss" scoped>
</style>
