<template lang="pug">
  .d-flex.flex-wrap.justify-content-between
    //- b-button-group(
    //-   v-for="(chunk, oidx) in emojis"
    //-   :key="`chunk_${oidx}`"
    //-   :size="size"
    //- )
    b-button.border-0(
      variant="outline-light"
      v-for="(emojiTxt, idx) in emojis"
      :key="`emoji_${idx}`"
      :size="size"
      :title="emojiLib.unemojify(emojiTxt)"
      @click="$emit('click', emojiTxt)"

    ) {{ emojiTxt }}
</template>

<script>
export default {
  props: {
    size: { type: String, default: 'lg' }
  },
  data: () => ({
    emojiLib: require('node-emoji'),
    emoji: '😃 😍 😝 😱 😵 😭 👋 👌 👍 👎 👏 ⭐ 💯 💤 ❗ ⚠️ ⛔ 😰 🤣 ☕ 😠 ❓ 😡 🙏 👀 🤬 😁 😆 😅 😂 💗 💛 💚 💔 😎 🤡 🔴 🟢 🟡 😏 😐 😞 😟 😖 🥱 😤 😮 😨 😷 🤕 🤢 🤧 🥵 🥶 💩 🤝 👈 👉 👆 👇 ☝ ✌ 🤞 🤚 🖐 💪 🙋 🙋‍♂️ ㊗️'
  }),
  computed: {
    emojis () { return this.$utils._.compact([this.emojiLib.random().emoji, ...this.emoji.split(/\s+/), this.emojiLib.random().emoji]) }
  }
};
</script>

<style lang="scss" scoped>
</style>
