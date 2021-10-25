<template lang="pug">
  .bottom.d-flex.justify-content-between.text-muted.s-75
    .d-flex.justify-content-start
      b-icon.mr-1.my-auto(icon="info-circle-fill" :animation="empty(displayText) ? '' : 'fade'" :variant="empty(displayText) ? 'light' : 'info'" font-scale="1.25")
      transition(name="list" mode="out-in"): .my-auto.mr-2(v-if="!empty(displayText)") #[span {{ displayText }}] #[b-icon(icon="three-dots" animation="cylon")]
    .text-right
      transition(name="list" mode="out-in"): span(v-if="!empty(domain)") {{ domain }} / 
      span {{ platform }}
</template>

<script>
export default {
  data: () => ({
    clearTimer: null,
    displayText: ''
  }),
  watch: {
    // from $store
    statusText (val) {
      clearTimeout(this.clearTimer)
      this.displayText = this.empty(this.userid) ? '等待擷取目前登入使用者ID' : val
      this.clearTimer = setTimeout(() => this.displayText = '', 5000)
    }
  }
}
</script>

<style lang="scss" scoped>
.bottom {
  width: 475px;
  position: absolute;
  left: .5rem;
  bottom: .25rem;
}
</style>