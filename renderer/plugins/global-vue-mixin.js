import $ from 'jquery'
import trim from 'lodash/trim'
import Vue from 'vue'
import { mapActions, mapGetters } from 'vuex'

const empty = function(value) {
  return value === undefined || value === null || value === NaN || value === 0 ||
         (typeof value === 'object' && Object.keys(value).length === 0) ||
         (typeof value === 'string' && trim(value).length === 0)
}

// inject to all Vue instances
Vue.mixin({
  data: () => ({
    isBusy: false,
    debugMessage: ''
  }),
  watch: {
    debugMessage (val) { this.$store.commit('statusText', val) },
    isBusy (flag) {
      if (flag) {
        this.toggleBusy({
          selector: this.$el,
          forceOn: true
        })
      } else {
        this.toggleBusy({
          selector: this.$el,
          forceOff: true
        })
      }
    }
  },
  computed: {
    ...mapGetters([
      'windowVisible',
      'authority',
      'apiUserinfo',
      'websocket',
      'connected',
      'disconnected',
      'messages',
      'unread',
      'totalUnread',
      'userMap',
      'userinfo',
      'username',
      'userdept',
      'effect',
      'history',
      'fetchingHistory',
      'ip',
      'domain',
      'hostname',
      'pcname',
      'userid',
      'ad',
      'apiHost',
      'apiPort',
      'fePort',
      'password',
      'address',
      'os',
      'user',
      'timer',
      'participatedChannels',
      'platform',
      'currentChannel',
      'currentChannelName',
      'currentChannelMessageCount',
      'chatRooms',
      'notifySettings',
      'imageMemento',
      'imageMementoCapacity',
      'imageMementoCacheKey',
      'latestImageMemento',
      'messageMemento',
      'messageMementoCapacity',
      'messageMementoCacheKey',
      'latestMessageMemento',
      'connectedUsers',
      'connectedUsersReverse',
      'connectedUsersCount',
      'statusText',
      'emojiTxt',
      'emojiCode',
      'lastModalId',
      'tySvrIp',
      'userDataCacheDuration',
      'regexpMarkdImage',
      'regexpReplyHeader'
    ]),
    viewportRatio () { return ((window.innerWidth) * 1.08).toFixed(2) / (window.innerHeight - 85 - 20).toFixed(2) },
    belongToInf () { return this.userdept === 'inf' },
    belongToAdm () { return this.userdept === 'adm' },
    belongToVal () { return this.userdept === 'val' },
    belongToReg () { return this.userdept === 'reg' },
    belongToSur () { return this.userdept === 'sur' },
    belongToAcc () { return this.userdept === 'acc' },
    belongToHr () { return this.userdept === 'hr' },
    belongToSupervisor () { return ['supervisor', 'director', 'secretary'].includes(this.userdept)  },
    apiQueryUrl () { return `http://${this.apiHost}:${this.apiPort}` },
    feQueryUrl () { return `http://${this.apiHost}:${this.fePort}` },
    uploadUrl () { return `${this.apiQueryUrl}${this.$consts.API.FILE.BASE64}`},
    site () {
      if (/^192\.168\.[1-9]\./gm.test(this.ip) || /^220\.1\.33\./gm.test(this.ip)) {
        return 'H0'
      }
      if (/^192\.168\.1[1-9]\./gm.test(this.ip) || /^220\.1\.34\./gm.test(this.ip)) {
        return 'HA'
      }
      if (/^192\.168\.2[1-9]\./gm.test(this.ip) || /^220\.1\.35\./gm.test(this.ip)) {
        return 'HB'
      }
      if (/^192\.168\.3[1-9]\./gm.test(this.ip) || /^220\.1\.36\./gm.test(this.ip)) {
        return 'HC'
      }
      if (/^192\.168\.4[1-9]\./gm.test(this.ip) || /^220\.1\.37\./gm.test(this.ip)) {
        return 'HD'
      }
      if (/^192\.168\.5[1-9]\./gm.test(this.ip) || /^220\.1\.38\./gm.test(this.ip)) {
        return 'HE'
      }
      if (/^192\.168\.6[1-9]\./gm.test(this.ip) || /^220\.1\.39\./gm.test(this.ip)) {
        return 'HF'
      }
      if (/^192\.168\.7[1-9]\./gm.test(this.ip) || /^220\.1\.40\./gm.test(this.ip)) {
        return 'HG'
      }
      if (/^192\.168\.8[1-9]\./gm.test(this.ip) || /^220\.1\.41\./gm.test(this.ip)) {
        return 'HH'
      }
      return ''
    },
    defaultSvrIp () {
      return this.tySvrIp.get(this.site)
    }
  },
  methods: {
    ...mapActions([
      'resetUnread',
      'plusUnread'
    ]),
    $,  // jQuery '$'
    empty,
    getFirstDNSIp () {
      const dnses = [...this.userinfo.dns]
      if (!empty(dnses)) {
        const first = this.$utils._.head(dnses)
        const tyland = dnses.find(ip => {
          return ip.startsWith('220.1.')
        })
        return tyland ? tyland : first
      }
      return ''
    },
    showUnread (channel) {
      const val = this.getUnread(channel)
      return parseInt(val) > 0 || val === '9+'
    },
    getUnread (channel) {
      if (this.unread) {
        let val = this.unread[channel] || 0
        return val > 9 ? '9+' : val
      }
      return 0
    },
    setCurrentChannel (channel) {
      this.$store.commit('currentChannel', channel)
      // switch to new channel reset the unread number
      this.$store.commit("resetUnread", channel)
    },
    queryOnlineClients () {
      const jsonString = JSON.stringify({
        type: "command",
        sender: this.userid,
        date: this.date(),
        time: this.time(),
        message: JSON.stringify({
          command: 'online',
          channel: this.currentChannel
        }),
        channel: 'system'
      })
      // [FIX] 增加狀態檢查
      if (this.websocket && this.websocket.readyState === 1) {
        this.websocket.send(jsonString)
      }
    },
    clearReconnectTimer() {
      if (this.timer !== null) {
        this.$config.isDev && this.log("清除重新連線檢查定時器")
        clearInterval(this.timer)
        this.$store.commit('timer', null)
      }
    },
    closeWebsocket() {
      // close the socket since the events only attach to this page
      this.websocket && this.websocket.close()
      this.$store.commit('websocket', undefined)
    },
    date() {
      const now = new Date()
      return (
        now.getFullYear() +
        "-" +
        ("0" + (now.getMonth() + 1)).slice(-2) +
        "-" +
        ("0" + now.getDate()).slice(-2)
      )
    },
    time() {
      const now = new Date()
      const time =
        ("0" + now.getHours()).slice(-2) +
        ":" +
        ("0" + now.getMinutes()).slice(-2) +
        ":" +
        ("0" + now.getSeconds()).slice(-2)
      return time
    },
    packMessage(text, opts = {}) {
      return JSON.stringify({
        ...{
          type: "mine",
          sender: this.userid,
          date: this.date(),
          time: this.time(),
          title: "dontcare",
          from: this.ip,
          message: text,
          channel: this.currentChannel,
          priority: 2
        },
        ...opts,
      })
    },
    packCommand(commandPayload) {
      const obj = {
        type: "command",
        sender: this.userid,
        date: this.date(),
        time: this.time(),
        message: JSON.stringify(commandPayload),
        channel: 'system'
      };
      return JSON.stringify(obj);
    },
    packImage(base64, alt, channel) {
      return this.packMessage(`![${alt}](${base64})`, { channel: channel || this.currentChannel })
    },
    sendImage (base64, alt, channel) {
      // [FIX] 增加狀態檢查
      if (this.websocket && this.websocket.readyState === 1) {
        this.websocket.send(this.packImage(base64, alt, channel))
      }
    },
    pasteImage (pasteEvent, callback) {
      const items = (pasteEvent.clipboardData || pasteEvent.originalEvent.clipboardData).items
      for (var i = 0 ; i < items.length ; i++) {
        const item = items[i]
        if (item.type.indexOf("image") !== -1) {
          this.log('剪貼版發現影像資料，準備直接轉換成base64影像資料 ... ')
          const file = item.getAsFile()
          this.uploadImage(file, callback)
        }
      }
    },
    uploadImage (file, callback) {
      this.isBusy = true
      const formData = new FormData()
      formData.append('file', file)
      formData.append('width', 1920)
      formData.append('height', 1080)
      formData.append('quality', 80)
      this.$utils.getUploadAxios().post(this.uploadUrl, formData).then(({ data }) => {
        if (!this.empty(data.encoded) && !this.empty(data.uri)) {
          const encoded = `${data.uri}${data.encoded}`
          this.$store.commit('addImageMemento', encoded)
          callback && callback(encoded)
          if (!this.$utils.statusCheck(data.status)) {
            this.warning(data.message, { title: '⚠️上傳圖檔結果' })
          }
        } else {
          this.warning('回傳的影像編碼有誤', { title: '⚠️貼上的影像處理問題' })
        }
      }).catch((err) => {
        this.err(err)
      }).finally(() => {
        this.isBusy = false
      })
    },
    getChannelName(channelId) {
      switch (channelId) {
        case 'announcement': return '公告'
        case 'lds': return '全所'
        case 'inf': return '資訊課'
        case 'adm': return '行政課'
        case 'reg': return '登記課'
        case 'sur': return '測量課'
        case 'val': return '地價課'
        case 'hr': return '人事室'
        case 'acc': return '會計室'
        case 'supervisor': return '主任祕書室'
        case 'system': return '系統'
        default:
          const found = this.participatedChannels.find(item => item.id === channelId)
          if (found) {
            return found.participants.find(val => val !== this.userid)
          }
          return channelId
      }
    },
    parseHTML (string) {
      const context = document.implementation.createHTMLDocument()
      const base = context.createElement('base')
      base.href = document.location.href
      context.head.appendChild(base)
      context.body.innerHTML = string
      return context.body.children
    },
    toggleBusy (opts = {}) {
      const def = {
        selector: 'body',
        style: 'ld-over',
        forceOff: false,
        forceOn: false,
        size: 'lg'
      }
      opts = {...def, ...opts}
      const container = this.$(opts.selector)
      if (container.length > 0) {
        const removeSpinner = (element, style) => {
          element.removeClass(style)
          element.find('.auto-add-spinner').remove()
          element.removeClass('running')
        }
        const addSpinner = (element, style) => {
          element.addClass(style)
          element.addClass('running')
          const coverEl = this.$(this.parseHTML('<div class="ld auto-add-spinner"></div>'))
          coverEl
            .addClass(this.$consts.loadingShapeSet[this.$utils.rand(this.$consts.loadingShapeSet.length)])
            .addClass(this.$consts.loadingShapeColor[this.$utils.rand(this.$consts.loadingShapeColor.length)])
          switch (opts.size) {
            case 'xs': coverEl.addClass('s-xs'); break
            case 'sm': coverEl.addClass('s-sm'); break
            case 'md': coverEl.addClass('s-md'); break
            case 'lg': coverEl.addClass('s-lg'); break
            case 'xl': coverEl.addClass('s-xl'); break
          }
          container.append(coverEl)
        }
        if (opts.forceOff) {
          removeSpinner(container, opts.style)
          this.$emit('busyOff', this)
        } else if (opts.forceOn) {
          removeSpinner(container, opts.style)
          addSpinner(container, opts.style)
          this.$emit('busyOn', this)
        } else if (container.hasClass(opts.style)) {
          removeSpinner(container, opts.style)
          this.$emit('busyOff', this)
        } else {
          addSpinner(container, opts.style)
          this.$emit('busyOn', this)
        }
      } else {
        this.err(`${opts.selector} not found in DOM`)
      }
    },
    timeout (func, ms) {
      return new Promise((resolve, reject) => {
        if (parseInt(ms) === NaN || parseInt(ms) < 1) {
          reject(new Error('timeout function second param should be an integer that is greater than 0'))
        } else if (typeof func !== 'function') {
          reject(new Error('timeout function first param should be a function'))
        } else {
          resolve(setTimeout(func, ms))
        }
      })
    },
    makeToast (message, opts = {}) {
      return new Promise((resolve, reject) => {
        if (this.$isServer) {
          reject('Server side doesn\'t use toast')
        } else if (this.$bvToast) {
          switch (opts.pos) {
            case 'tr': opts.toaster = 'b-toaster-top-right'; break
            case 'tl': opts.toaster = 'b-toaster-top-left'; break
            case 'br': opts.toaster = 'b-toaster-bottom-right'; break
            case 'bl': opts.toaster = 'b-toaster-bottom-left'; break
            case 'tc': opts.toaster = 'b-toaster-top-center'; break
            case 'tf': opts.toaster = 'b-toaster-top-full'; break
            case 'bc': opts.toaster = 'b-toaster-bottom-center'; break
            case 'bf': opts.toaster = 'b-toaster-bottom-full'; break
            default:
              switch(opts.variant) {
                case 'danger': case 'red': opts.toaster = 'b-toaster-top-full'; break
                case 'warning': case 'yellow': opts.toaster = 'b-toaster-top-left'; break
                default: opts.toaster = 'b-toaster-top-right'
              }
          }
          const merged = Object.assign({
            title: '📣 通知',
            subtitle: this.$utils.now().split(' ')[1],
            href: '',
            noAutoHide: false,
            autoHideDelay: 5000,
            solid: true,
            toaster: 'b-toaster-top-right',
            appendToast: true,
            variant: 'info'
          }, opts)
          const h = this.$createElement
          const vNodesTitle = h(
            'div', { class: ['d-flex', 'flex-grow-1', 'align-items-baseline', 'mr-2'] },
            [
              h('strong', { class: 'mr-2' }, merged.title),
              h('small', { class: 'ml-auto text-italics' }, merged.subtitle)
            ]
          )
          merged.title = [vNodesTitle]
          const msgVNode = h('div', { domProps: { innerHTML: message } })
          this.$bvToast.toast([msgVNode], merged)
          merged.message = message
          resolve(merged)
        } else {
          reject(new Error('No this.$bvToast, toast window can not be shown'))
        }
      })
    },
    notify (msg, opts = { title: '📢 通知' }) {
      if (this.windowVisible) {
        return new Promise((resolve, reject) => {
          if (typeof msg !== 'string' && typeof opts !== 'object') {
            this.err(msg, opts)
            reject(`notify 傳入參數有誤: msg:${msg}, opts: ${opts}`)
          } else {
            const defDelay = (opts.variant === 'danger' ? 7500 : (opts.variant === 'warning' ? 6250 : 5000))
            if (typeof msg === 'string') {
              opts.variant = opts.type || opts.variant || 'default'
              opts.autoHideDelay = opts.duration || opts.delay || defDelay
            } else if (typeof msg === 'object') {
              opts = msg
              msg = opts.body || opts.message
              opts.variant = opts.type || opts.variant || 'default'
              opts.autoHideDelay = opts.duration || opts.delay || defDelay
            }
            this.makeToast(msg, opts).then((config) => {
              resolve(config)
            }).catch((err) => {
              this.err(err)
              reject(err)
            }).finally(() => {
              opts.type === 'danger' ? this.err(msg, opts) : this.$config.isDev && this.log(msg, opts)
            })
          }
        })
      }
      this.$config.isDev && this.warn(`document不可見，略過notify訊息`, msg)
    },
    warning (message, opts = {}) {
      if (!empty(message)) {
        const merged = Object.assign({
          title: '⚠️ 警示',
          autoHideDelay: 7500,
          pos: 'tl',
          variant: 'warning'
        }, opts)
        this.notify(message, merged)
        this.warn(message, merged)
      }
    },
    alert (message, opts = {}) {
      if (!empty(message)) {
        if (opts && opts.pos === 'bottom') {
          opts.pos = 'bf'
        } else if (opts && opts.pos === 'top') {
          opts.pos = 'tf'
        }
        const merged = Object.assign({
          title: '❌ 錯誤',
          autoHideDelay: 10000,
          variant: 'danger'
        }, opts)
        this.notify(message, merged)
      }
    },
    attention (selector, opts = { name: 'flash', speed: 'faster' }) {
      return process.client && this.windowVisible && this.$utils.animated(selector, opts)
    },
    showModalById (id) {
      this.$bvModal && this.$bvModal.show(id)
    },
    hideModalById (id) {
      this.$bvModal && this.$bvModal.hide(id)
    },
    modal (message, opts) {
      return new Promise((resolve, reject) => {
        if (this.$isServer) {
          reject('Server side doesn\'t use modal')
        } else if (this.$bvModal) {
          const merged = Object.assign({
            title: '訊息', size: 'md', buttonSize: 'sm', okVariant: 'outline-secondary',
            okTitle: '關閉', hideHeaderClose: false, centered: true, scrollable: true,
            hideFooter: true, noCloseOnBackdrop: false, noFade: false, contentClass: 'shadow',
            html: false, root: false
          }, opts)
          merged.footerClass = merged.hideFooter ? 'd-none' : 'p-2'
          if (typeof message === 'object') {
            message = [message]
          } else if (merged.html) {
            merged.titleHtml = merged.title
            merged.title = undefined
            const msgVNode = this.$createElement('div', { domProps: { innerHTML: message } })
            message = [msgVNode]
          }
          const modal = merged.root ? this.$root.$bvModal : this.$bvModal
          modal.msgBoxOk(message, merged).then((val) => {}).catch(err => { reject(err) })
          merged.message = message
          resolve(merged)
        } else {
          reject(new Error('No this.$bvModal, modal window can not be shown'))
        }
      })
    },
    confirm (message, opts = {}) {
      return new Promise((resolve, reject) => {
        if (this.$isServer) {
          reject('Server side doesn\'t use confirm')
        } else if (this.$bvModal) {
          const merged = Object.assign({
            title: '請確認', size: 'sm', buttonSize: 'sm', okVariant: 'outline-success', okTitle: '確定',
            cancelVariant: 'secondary', cancelTitle: '取消', footerClass: 'p-2', hideHeaderClose: false,
            noCloseOnBackdrop: false, centered: true, contentClass: 'shadow'
          }, opts)
          const h = this.$createElement
          const msgVNode = h('div', { domProps: { innerHTML: message } })
          this.$bvModal.msgBoxConfirm([msgVNode], merged).then((value) => {
            resolve(value)
          }).catch((err) => {
            reject(err)
          })
        } else {
          reject(new Error('No this.$bvModal, confirm window can not be shown'))
        }
      })
    },
    trigger (evtName, payload) {
      if (CustomEvent) {
        let evt = new CustomEvent(evtName, { detail: payload, bubbles: true })
        Object.defineProperty(evt, 'target', {writable: false, value: this.$el})
        this.$emit(evtName, evt)
        return evt
      } else {
        this.warn('CustomEvent not defined?')
      }
    },
    async setCache (key, val, expire_timeout = 0) {
      if (empty(key) || this.$localForage === undefined) { return false }
      try {
        const item = { key, value: val, timestamp: +new Date(), expire_ms: expire_timeout }
        this.$localForage.setItem(key, item).then((value) => {}).catch((err) => { this.err(err) })
      } catch (err) {
        this.err(err)
        return false
      }
      return true
    },
    async getCache (key) {
      if (empty(key) || this.$localForage === undefined) { return false }
      try {
        const item = await this.$localForage.getItem(key)
        if (empty(item)) { return false }
        const ts = item.timestamp
        const expireTime = item.expire_ms || 0
        const now = +new Date()
        if (expireTime !== 0 && now - ts > expireTime) {
          await this.$localForage.removeItem(key)
          return false
        } else {
          return item.value
        }
      } catch (err) {
        this.err(err)
      }
      return false
    },
    async getCacheExpireRemainingTime (key) {
      if (empty(key) || this.$localForage === undefined) { return false }
      try {
        const item = await this.$localForage.getItem(key)
        if (empty(item)) { return false }
        const ts = item.timestamp
        const expireTime = item.expire_ms || 0
        const now = +new Date()
        if (expireTime === 0) {
          return false
        } else {
          return expireTime - (now - ts)
        }
      } catch (err) {
        this.err(err)
      }
      return false
    },
    async removeCache (key) {
      if (empty(key) || this.$localForage === undefined) { return false }
      try {
        await this.$localForage.removeItem(key)
      } catch (err) {
        this.err(err)
      }
      return true
    },
    async clearCache () {
      await this.$localForage.clear()
    },
    log () { this.$config.isDev && this.$utils.log(`ℹ️ ${this.time()}`, ...arguments ) },
    warn () { this.$config.isDev && this.$utils.warn(`⚠️ ${this.time()}`, ...arguments ) },
    err () { this.$config.isDev && this.$utils.error(`🚩 ${this.time()}`, ...arguments ) },
    debug () {
      this.debugMessage = String(arguments[0])
      this.$config.isDev && this.$utils.debug(`🐛 ${this.time()}`, ...(arguments))
    }
  }
})