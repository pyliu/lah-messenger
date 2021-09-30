<template lang="pug">
  .d-flex.flex-wrap.justify-content-between
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
    emojiStr: '⚠️ ⛔ 😰 🤣 ☕ 😠 ❗ ❓ 😡 🙏 👀 🤬 😁 😆 😅 😂 💗 💛 💚 💔 😜 😎 🔴 🟢 🟡 😏 😐 😞 😟 😖 🥱 😤 😮 😨 😷 🤕 🤢 🤧 🥵 🥶 💩 🤝 👈 👉 👆 👇 ☝ ✌ 🤞 🤚 🖐 💪 🙋 🙋‍♂️ ㊗️'
  }),
  computed: {
    emojis () { return [...new Set(this.$utils._.compact([
        this.emojiTxt, // from store
        '😃', '😍', '😝', '😱', '😵', '😭', '👋', '👌', '👍', '👎', '👏', '⭐', '💯', '💤', // fixed front
        ...this.emojiStr.split(/\s+/).sort(() => Math.random() - 0.5),  // 後面亂數排序
        this.emojiLib.random().emoji,
        this.emojiLib.random().emoji,
        this.emojiLib.random().emoji,
        this.emojiLib.random().emoji,
        this.emojiLib.random().emoji,
        this.emojiLib.random().emoji,
        this.emojiLib.random().emoji
      ]))]
    }
  },
  methods: {
    shuffle (array) {
      // Fisher-Yates 亂數排序
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        [array[i], array[j]] = [array[j], array[i]]
      }
      return array
    }
  }
};
</script>

<style lang="scss" scoped>
</style>
