/**
 * @file home-desktop.js
 * @description 首頁桌面整合、Electron/Tauri IPC 監聽、未讀計數、工作列閃爍與視窗標題管理 Mixin
 */
export default {
  watch: {
    totalUnread (val) {
      const unreadCount = Number(val) || 0
      this.ipcRenderer?.invoke('toggleUnreadTrayIcon', { unread: unreadCount })
      if (unreadCount > 0) {
        const isFocused = typeof document !== 'undefined' && document.hasFocus() && !document.hidden
        if (!isFocused) {
          this.ipcRenderer?.invoke('flash-frame', { flag: true })
        }
      } else {
        this.ipcRenderer?.invoke('flash-frame', { flag: false })
      }
    }
  },

  methods: {
    updateWindowTitle () {
      const parts = []
      const ip = this.userinfo?.ip || this.ip || ''
      if (!this.empty(ip) && String(ip) !== 'undefined') parts.push(ip)
      const name = this.adName || this.adAccount || this.userid || ''
      if (!this.empty(name) && String(name) !== 'undefined') parts.push(name)
      const dept = this.deptName
      if (
        !this.empty(dept) &&
        dept !== '未知課室' &&
        String(dept) !== 'undefined'
      ) {
        parts.push(dept)
      }

      const titleStr = parts.join(' / ')
      if (titleStr && !titleStr.includes('undefined')) {
        this.ipcRenderer?.invoke('title', titleStr)
      }
    },

    ipcRendererSetup () {
      const { ipcRenderer } = require('electron')
      this.ipcRenderer = ipcRenderer
      this.ipcRenderer.on('set-current-channel', (e, channel) =>
        this.setCurrentChannel(channel)
      )
      this.ipcRenderer.on('in-browser-notify', (e, p) =>
        p.statusOnly
          ? this.setConnectText(p.message)
          : this.notify(p.message, {
            type: p.type || 'info',
            title: p.title || '📢 通知'
          })
      )
    },

    async triggerNotification (incoming) {
      const sender = incoming.sender || incoming.message?.sender
      const isSelf = this.$utils.equal(sender, this.userid) || this.$utils.equal(sender, this.adAccount)
      if (isSelf) return

      this.ipcRenderer?.invoke('unread', incoming.channel)
      this.invokeNotification(incoming)
    },

    // 🟢 訊息提醒與工作列閃爍控制
    async invokeNotification (i) {
      const sender = i.sender || i.message?.sender
      const isSelf = this.$utils.equal(sender, this.userid) || this.$utils.equal(sender, this.adAccount)
      if (isSelf) return

      const temp = document.createElement('div')
      temp.innerHTML = i.message?.title || i.message?.message || i.message || ''
      const fullText = temp.textContent || temp.innerText || ''
      this.setCache(`${i.channel}_last_id`, i.message?.id || i.id)

      const senderName = this.userMap[sender] || sender || '同事'
      this.setConnectText(`💬 來自 ${senderName}: ${fullText}`)

      // 檢查視窗是否處於前景活動中
      const isFocused = typeof document !== 'undefined' && document.hasFocus() && !document.hidden

      // 依規格：視窗非前景狀態（最小化、置於背景、或在操作其他視窗時）收到訊息，工作列圖示持續橘色閃爍！
      if (!isFocused) {
        this.ipcRenderer?.invoke('flash-frame', { flag: true })
      }
    },

    onWindowFocus () {
      // 點入視窗取得焦點時，立即熄滅停止工作列閃爍與退避計時
      this.ipcRenderer?.invoke('flash-frame', { flag: false })
    },

    onWindowBlur () {
      // 視窗離開焦點時，若尚有未讀訊息，啟動退避閃爍排程
      if (this.totalUnread > 0) {
        this.ipcRenderer?.invoke('flash-frame', { flag: true })
      }
    },

    checkUnread () {
      if (this.totalUnread > 0) {
        this.ipcRenderer?.invoke('notification', {
          message: `您有 ${this.totalUnread} 個未讀訊息!`,
          showMainWindow: false
        })
      }
      this.timeout(this.checkUnread, this.checkUreadDuration).then(
        (h) => (this.checkUnreadTimer = h)
      )
    }
  }
}
