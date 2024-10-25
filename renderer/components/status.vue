<template lang="pug">
.bottom.d-flex.justify-content-between.text-muted.s-75
  .d-flex.justify-content-start.truncate
    b-icon.mr-1.my-auto(icon="info-circle-fill" :animation="empty(displayText) ? '' : 'fade'" :variant="empty(displayText) ? 'light' : 'info'" font-scale="1.25")
    transition(name="list" mode="out-in"): .my-auto.mr-2(v-if="!empty(displayText)") #[span {{ displayText }}] #[b-icon(icon="three-dots" animation="cylon")]
  .text-right.text-nowrap
    //- transition(name="list" mode="out-in"): span(v-if="!empty(shortDomain)") {{ shortDomain }} / 
    span {{ appVer }}
    b-icon.ml-1.help(icon="question-circle-fill", variant="success", @click="showHelp", title="簡易說明")
</template>

<script>
import Help from '~/components/help.vue';
export default {
  components: { Help },
  data: () => ({
    clearTimer: null,
    displayText: '',
    appVer: ''
  }),
  computed: {
    shortDomain () {
      return this.domain?.split('.')[0]
    }
  },
  watch: {
    // from $store
    statusText (val) {
      clearTimeout(this.clearTimer)
      this.displayText = this.empty(this.userid) ? '等待擷取目前登入使用者ID' : val
      this.clearTimer = setTimeout(() => this.displayText = '', 5000)
    }
  },
  mounted () {
    const { ipcRenderer } = require("electron");
    ipcRenderer.invoke('version').then(ver => {
      this.appVer = `v${ver}`
    })
  },
  methods: {
    showHelp () {
      this.modal(this.$createElement(Help), {
        size: 'xl',
        title: `說明 - ${this.appVer}`
      })
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
.help {
  cursor: pointer;
}
</style>