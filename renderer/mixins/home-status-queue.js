/**
 * @file home-status-queue.js
 * @description 首頁底部狀態列訊息排程與防閃爍佇列 Mixin
 */
export default {
  data: () => ({
    connectText: '',
    msgQueue: [],
    processingQueue: false
  }),

  watch: {
    connectText (val) {
      this.$store.commit('statusText', val)
    }
  },

  methods: {
    setConnectText (text) {
      this.msgQueue.push(text)
      if (this.msgQueue.length > 10) this.msgQueue.shift()
      this.processQueue()
    },

    processQueue () {
      if (this.processingQueue || this.msgQueue.length === 0) return
      this.processingQueue = true
      const text = this.msgQueue.shift()
      this.connectText = text
      setTimeout(() => {
        this.processingQueue = false
        this.processQueue()
      }, 1000)
    }
  }
}
