<template lang="pug">
  .bottom.d-flex.justify-content-between.text-muted.s-75
    .d-flex.justify-content-start
      b-icon.mr-1(icon="info-circle-fill" animation="fade" variant="info" font-scale="1.25")
      .my-auto.mr-2 #[span(v-html="text")] #[b-icon(icon="three-dots" animation="cylon")]
    .text-right
      transition(name="list" mode="out-in"): div(v-if="!empty(domain)") {{ domain }} / {{ platform }}
</template>

<script>
export default {
  props: {
    statusText: { type: String, default: '' }
  },
  computed: {
    text () { return this.empty(this.userid) ? `等待擷取目前登入使用者ID` : this.statusText }
  }
}
</script>

<style lang="scss" scoped>
.bottom {
  width: 475px;
  position: absolute;
  left: .5rem;
  bottom: .5rem;
}
.bottom-right {
  position: absolute;
  right: .5rem;
  bottom: .5rem;
}
.bottom-left {
  position: absolute;
  left: .5rem;
  bottom: .5rem;
}
</style>