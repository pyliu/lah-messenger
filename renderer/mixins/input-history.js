// 訊息輸入框「按上鍵彈出最近送出訊息」共用邏輯
// 約定：元件需有 ref="textarea"（b-textarea）與 v-model 綁定的 inputText，
// 並在 b-textarea 掛上 @keydown="onKeydown"、@blur="closeHistory"。
const STORAGE_KEY = 'lah-messenger-input-history'
const MAX = 10

export default {
  data: () => ({
    historyOpen: false,
    historyIndex: 0,
    historyList: []
  }),
  methods: {
    loadInputHistory () {
      try {
        const arr = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
        return Array.isArray(arr) ? arr.filter(s => typeof s === 'string' && s.trim() !== '').slice(0, MAX) : []
      } catch (e) {
        return []
      }
    },
    pushHistory (text) {
      const t = (text || '').trim()
      if (!t) {
        return
      }
      const arr = this.loadInputHistory()
      if (arr[0] === t) {
        return
      }
      arr.unshift(t)
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(arr.slice(0, MAX)))
      } catch (e) {
        console.warn('儲存訊息歷史失敗', e)
      }
    },
    closeHistory () {
      this.historyOpen = false
    },
    openHistory () {
      // 由舊到新排列，最新一筆在最下方（最靠近輸入框）
      const list = this.loadInputHistory().reverse()
      if (list.length === 0) {
        return false
      }
      this.historyList = list
      this.historyIndex = list.length - 1
      this.historyOpen = true
      return true
    },
    chooseHistory (idx) {
      const text = this.historyList[idx]
      this.historyOpen = false
      if (text === undefined) {
        return
      }
      this.inputText = text
      this.$nextTick(() => {
        const el = this.$refs.textarea?.$el || this.$refs.textarea
        if (el && typeof el.focus === 'function') {
          el.focus()
          if (el.setSelectionRange) {
            el.setSelectionRange(text.length, text.length)
          }
        }
      })
    },
    onKeydown (e) {
      if (e.isComposing || e.keyCode === 229) {
        return
      }
      if (this.historyOpen) {
        const len = this.historyList.length
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          this.historyIndex = Math.max(0, this.historyIndex - 1)
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          this.historyIndex = Math.min(len - 1, this.historyIndex + 1)
        } else if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
          e.preventDefault()
          this.chooseHistory(this.historyIndex)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          // 避免 Esc 冒泡到 b-sidebar 造成整個側邊欄被關閉
          e.stopPropagation()
          this.historyOpen = false
        } else if (e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt') {
          this.historyOpen = false
        }
        return
      }
      if (e.key !== 'ArrowUp' || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) {
        return
      }
      const ta = e.target
      const onFirstLine = !ta || ta.selectionStart !== ta.selectionEnd
        ? false
        : ta.value.substring(0, ta.selectionStart).includes('\n') === false
      if ((this.inputText || '') === '' || onFirstLine) {
        if (this.openHistory()) {
          e.preventDefault()
        }
      }
    }
  }
}
