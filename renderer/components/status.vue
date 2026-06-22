<template lang="pug">
.bottom.d-flex.justify-content-between.text-muted.s-85
  //- 🟢 [修改點] 加上 status-clickable 類別與 @click 事件
  .d-flex.justify-content-start.truncate.status-clickable(
    @click="showHistory = true"
    title="點擊查看歷史狀態訊息"
  )
    b-icon.mr-1.my-auto(icon="info-circle-fill" :animation="empty(displayText) ? '' : 'fade'" :variant="empty(displayText) ? 'light' : 'info'" font-scale="1.25")
    transition(name="list" mode="out-in"): .my-auto.mr-2(v-if="!empty(displayText)") #[span {{ displayText }}] #[b-icon(icon="three-dots" animation="cylon")]
  
  .text-right.text-nowrap
    span {{ appVer }}
    b-icon.ml-1.help(icon="question-circle-fill", variant="success", @click="showHelp", title="簡易說明")

  //- 🟢 [新增點] 歷史訊息 Modal 視窗
  b-modal(
    v-model="showHistory"
    scrollable
    hide-footer
    size="lg"
    body-class="p-0"
  )
    template(#modal-title)
      .d-flex.align-items-center
        b-icon.mr-2(icon="clock-history")
        span 狀態列歷史紀錄
        b-button.ml-3(
          v-if="history.length > 0"
          size="sm" 
          variant="outline-danger" 
          pill 
          @click="history = []"
        ) 清空
    
    .text-center.text-muted.my-4(v-if="history.length === 0") 尚無紀錄
    b-list-group(v-else flush)
      b-list-group-item.py-2.px-3(v-for="(item, idx) in history" :key="`history_${idx}`")
        .d-flex.w-100.justify-content-between.align-items-center
          span.text-dark {{ item.text }}
          small.text-muted.text-nowrap.ml-3 {{ item.time }}
</template>

<script>
import Help from '~/components/help.vue';
export default {
  components: { Help },
  data: () => ({
    clearTimer: null,
    displayText: '',
    appVer: '',
    // 🟢 [新增點] 歷史紀錄陣列與視窗控制開關
    history: [],
    showHistory: false
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
      const text = this.empty(this.userid) ? '等待擷取目前登入使用者ID' : val
      this.displayText = text
      
      // 🟢 [新增點] 攔截並推入歷史紀錄
      if (!this.empty(text)) {
        this.history.unshift({
          time: this.$utils.now(), // 格式如 2026-06-22 09:30:00
          text: text
        })
        // 限制最多保留 50 筆，避免常駐程式記憶體膨脹
        if (this.history.length > 50) {
          this.history.pop()
        }
      }

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
  bottom: .35rem;
}
.help {
  cursor: pointer;
}

/* 🟢 [新增點] 讓狀態列看起來是可以互動的按鈕 */
.status-clickable {
  cursor: pointer;
  transition: background-color 0.2s;
  border-radius: 4px;
  padding: 2px 4px;
  margin-left: -4px; /* 抵銷 padding，保持原本的視覺對齊 */
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
}
</style>