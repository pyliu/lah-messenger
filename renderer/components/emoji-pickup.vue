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
export default {
  props: {
    size: { type: String, default: 'md' }
  },
  data: () => ({
    emoji: '😀 😍 👍 💤 😝 😃 😱 😭 😰 😄 😠 😡 🤬 😁 😆 😅 😂 🤣 😇 😉 😊 🙂 🙃 😋 😌 🥰 😘 😗 😙 😚 🤪 😜 😛 🤑 😎 🤓 🧐 🤠 🥳 🤗 🤡 😏 😶 😐 😑 😒 🙄 🤨 🤔 🤫 🤭 🤥 😳 😞 😟 😔 😕 🙁 ☹ 😬 🥺 😣 😖 😫 😩 🥱 😤 😮 😮 😨 😯 😦 😧 😢 😥 😪 🤤 😓 🤩 😵 😵 🥴 😲 🤯 🤐 😷 🤕 🤒 🤮 🤢 🤧 🥵 🥶 😴 😈 👿 👹 👺 💩 👐 🤲 🙌 👏 🙏 🤝 👎 👊 ✊ 🤛 🤜 🤞 ✌ 🤘 🤟 👌  🤏 👈 👉 👆 👇 ☝ ✋ 🤚 🖐 🖖 👋 🤙 💪 🦾👀 🙋 🙋‍♂️ ❤ 🧡 💛 💚 💙 💜 🤎 🖤 🤍 💔 '
  }),
  computed: {
    chunks () { return this.$utils._.chunk(this.emojis, 10) },
    emojis () { return this.$utils._.compact(this.emoji.split(' ')) }
  },
  mounted() {
    
  }
};
</script>

<style lang="scss" scoped>
</style>
