import Vue from 'vue'
import { mapActions, mapGetters } from 'vuex'
import $ from 'jquery'
import trim from 'lodash/trim'

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
      'websocket',
      'connected',
      'disconnected',
      'messages',
      'unread',
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
      'imageMemento',
      'imageMementoCapacity',
      'imageMementoCacheKey',
      'connectedUsers',
      'connectedUsersReverse',
      'connectedUsersCount',
      'statusText'
    ]),
    viewportRatio () { return ((window.innerWidth) * 1.08).toFixed(2) / (window.innerHeight - 85 - 20).toFixed(2) },
    belongToInf () { return this.userdept === 'inf' },
    belongToAdm () { return this.userdept === 'adm' },
    belongToVal () { return this.userdept === 'val' },
    belongToReg () { return this.userdept === 'reg' },
    belongToSur () { return this.userdept === 'sur' },
    belongToAcc () { return this.userdept === 'acc' },
    belongToHr () { return this.userdept === 'hr' },
    belongToSupervisor () { return this.userdept === 'supervisor' },
    apiQueryUrl () { return `http://${this.apiHost}:${this.apiPort}` },
    feQueryUrl () { return `http://${this.apiHost}:${this.fePort}` }
  },
  methods: {
    ...mapActions([
      'resetUnread',
      'plusUnread'
    ]),
    getFirstDNSIp () {
      if (!empty(this.userinfo.dns)) {
        return [...this.userinfo.dns].find(ip => {
          return ip.startsWith('220.1.')
        })
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
    queryChatChannelOnlineClients () {
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
      this.websocket && this.websocket.send(jsonString)
    },
    clearReconnectTimer() {
      if (this.timer !== null) {
        this.$config.isDev && console.log(this.time(), "?????????????????????????????????")
        clearInterval(this.timer)
        this.$store.commit('timer', null)
      }
    },
    closeWebsocket() {
      // close the socket since the events only attach to this page
      this.websocket && this.websocket.close()
      this.$store.commit('websocket', undefined)
    },
    empty,
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
        },
        ...opts,
      })
    },
    packImage(base64, alt, channel) {
      return this.packMessage(`![${alt}](${base64})`, { channel: channel || this.currentChannel })
    },
    getChannelName(channelId) {
      switch (channelId) {
        case 'announcement': return '??????'
        case 'lds': return '??????'
        case 'inf': return '?????????'
        case 'adm': return '?????????'
        case 'reg': return '?????????'
        case 'sur': return '?????????'
        case 'val': return '?????????'
        case 'hr': return '?????????'
        case 'acc': return '?????????'
        case 'supervisor': return '???????????????'
        case 'system': return '??????'
        default:
          // TODO: find channel name by query
          const found = this.participatedChannels.find(item => item.id === channelId)
          if (found) {
            return found.participants.find(val => val !== this.userid)
          }
          return channelId
      }
    },
    $,  // jQuery '$',
    parseHTML (string) {
      const context = document.implementation.createHTMLDocument()
      // Set the base href for the created document so any parsed elements with URLs
      // are based on the document's URL
      const base = context.createElement('base')
      base.href = document.location.href
      context.head.appendChild(base)
      context.body.innerHTML = string
      return context.body.children
    },
    toggleBusy (opts = {}) {
      const def = {
        selector: 'body',
        style: 'ld-over', // ld-over, ld-over-inverse, ld-over-full, ld-over-full-inverse
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

          // randomize loading.io css for fun
          const coverEl = this.$(this.parseHTML('<div class="ld auto-add-spinner"></div>'))
          coverEl
            .addClass(this.$consts.loadingShapeSet[this.$utils.rand(this.$consts.loadingShapeSet.length)]) // shape
            .addClass(this.$consts.loadingShapeColor[this.$utils.rand(this.$consts.loadingShapeColor.length)]) // color
          switch (opts.size) {
            case 'xs':
              coverEl.addClass('s-xs')
              break
            case 'sm':
              coverEl.addClass('s-sm')
              break
            case 'md':
              coverEl.addClass('s-md')
              break
            case 'lg':
              coverEl.addClass('s-lg')
              break
            case 'xl':
              coverEl.addClass('s-xl')
              break
            default:
              break
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
        console.error(`${opts.selector} not found in DOM`)
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
          // position adapter
          switch (opts.pos) {
            case 'tr':
              opts.toaster = 'b-toaster-top-right'
              break
            case 'tl':
              opts.toaster = 'b-toaster-top-left'
              break
            case 'br':
              opts.toaster = 'b-toaster-bottom-right'
              break
            case 'bl':
              opts.toaster = 'b-toaster-bottom-left'
              break
            case 'tc':
              opts.toaster = 'b-toaster-top-center'
              break
            case 'tf':
              opts.toaster = 'b-toaster-top-full'
              break
            case 'bc':
              opts.toaster = 'b-toaster-bottom-center'
              break
            case 'bf':
              opts.toaster = 'b-toaster-bottom-full'
              break
            default:
              // override the position by type/variant
              switch(opts.variant) {
                case 'danger':
                case 'red':
                  opts.toaster = 'b-toaster-top-full'
                  break
                case 'warning':
                case 'yellow':
                  opts.toaster = 'b-toaster-top-left'
                  break
                default:
                  opts.toaster = 'b-toaster-top-right'
              }
          }
          // merge default setting
          const merged = Object.assign({
            title: '??????',
            subtitle: this.$utils.now().split(' ')[1],
            href: '',
            noAutoHide: false,
            autoHideDelay: 5000,
            solid: true,
            toaster: 'b-toaster-top-right',
            appendToast: true,
            variant: 'info'
          }, opts)
          // Use a shorter name for this.$createElement
          const h = this.$createElement
          // Create the title
          const vNodesTitle = h(
            'div', {
              class: ['d-flex', 'flex-grow-1', 'align-items-baseline', 'mr-2']
            },
            [
              h('strong', {
                class: 'mr-2'
              }, merged.title),
              h('small', {
                class: 'ml-auto text-italics'
              }, merged.subtitle)
            ]
          )
          // Pass the VNodes as an array for title
          merged.title = [vNodesTitle]
          // use vNode for HTML content
          const msgVNode = h('div', {
            domProps: {
              innerHTML: message
            }
          })

          this.$bvToast.toast([msgVNode], merged)

          // resolve the final opts back
          merged.message = message
          resolve(merged)
        } else {
          reject(new Error('No this.$bvToast, toast window can not be shown'))
        }
      })
    },
    notify (msg, opts = { title: '??????' }) {
      if (document && !document.hidden) {
        return new Promise((resolve, reject) => {
          if (typeof msg !== 'string' && typeof opts !== 'object') {
            reject(`notify ??????????????????: msg:${msg}, opts: ${opts}`)
          } else {
            const defDelay = (opts.variant === 'danger' ? 7500 : (opts.variant === 'warning' ? 6250 : 5000))
            if (typeof msg === 'string') {
              opts.variant = opts.type || opts.variant || 'default'
              opts.autoHideDelay = opts.duration || opts.delay || defDelay
            } else if (typeof msg === 'object') {
              opts = msg
              // previous API only use one object param
              msg = opts.body || opts.message
              opts.variant = opts.type || opts.variant || 'default'
              opts.autoHideDelay = opts.duration || opts.delay || defDelay
            }
            this.makeToast(msg, opts).then((config) => {
              resolve(config)
            }).catch((err) => {
              this.$utils.error(err)
              reject(err)
            })
          }
        })
      }
      this.$config.isDev && console.log(`document??????????????????notify??????`, msg)
    },
    warning (message, opts = {}) {
      if (!empty(message)) {
        const merged = Object.assign({
          title: '??????',
          autoHideDelay: 7500,
          pos: 'tl',
          variant: 'warning'
        }, opts)
        this.notify(message, merged)
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
          title: '??????',
          autoHideDelay: 10000,
          variant: 'danger'
        }, opts)
        this.notify(message, merged)
      }
    },
    attention (selector, opts = { name: 'flash', speed: 'faster' }) {
      return process.client && this.$utils.animated(selector, opts)
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
            title: '??????',
            size: 'md',
            buttonSize: 'sm',
            okVariant: 'outline-secondary',
            okTitle: '??????',
            hideHeaderClose: false,
            centered: true,
            scrollable: true,
            hideFooter: true,
            noCloseOnBackdrop: false,
            noFade: false,
            contentClass: 'shadow',
            html: false,
            root: false
          }, opts)
          // use d-none to hide footer
          merged.footerClass = merged.hideFooter ? 'd-none' : 'p-2'
          if (typeof message === 'object') {
            // assume the message is VNode
            message = [message]
          } else if (merged.html) {
            // HTML message content
            merged.titleHtml = merged.title
            merged.title = undefined
            const msgVNode = this.$createElement('div', { domProps: { innerHTML: message } })
            message = [msgVNode]
          }
          // https://bootstrap-vue.org/docs/components/modal#modal-message-boxes
          const modal = merged.root ? this.$root.$bvModal : this.$bvModal
          modal.msgBoxOk(message, merged).then((val) => {
            // val will be always true from $bvModal.msgBoxOk window closed
          }).catch(err => {
            reject(err)
          })
          // resolve the final opts back
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
            title: '?????????',
            size: 'sm',
            buttonSize: 'sm',
            okVariant: 'outline-success',
            okTitle: '??????',
            cancelVariant: 'secondary',
            cancelTitle: '??????',
            footerClass: 'p-2',
            hideHeaderClose: false,
            noCloseOnBackdrop: false,
            centered: true,
            contentClass: 'shadow'
          }, opts)
          // use HTML content
          const h = this.$createElement
          const msgVNode = h('div', { domProps: { innerHTML: message } })
          this.$bvModal.msgBoxConfirm([msgVNode], merged).then((value) => {
            resolve(value)  // true, false or null
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
        let evt = new CustomEvent(evtName, {
          detail: payload,
          bubbles: true
        })
        Object.defineProperty(evt, 'target', {writable: false, value: this.$el})
        this.$emit(evtName, evt)
        return evt
      } else {
        console.warn('CustomEvent not defined?')
      }
    },
    async setCache (key, val, expire_timeout = 0) {
      if (empty(key) || this.$localForage === undefined) { return false }
      try {
        const item = {
          key,
          value: val,
          timestamp: +new Date(), // == new Date().getTime()
          expire_ms: expire_timeout // milliseconds
        }
        this.$localForage.setItem(key, item).then((value) => {
          // Do other things once the value has been saved.
        }).catch((err) => {
          // This code runs if there were any errors
          this.$utils.error(err)
        })
      } catch (err) {
        this.$utils.error(err)
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
        // console.log(`get ${key} value. (expireTime: ${expireTime}), now - ts == ${now - ts}`, item.value)
        if (expireTime !== 0 && now - ts > expireTime) {
          await this.$localForage.removeItem(key)
          // console.log(`${key} is removed. (expireTime: ${expireTime}), now - ts == ${now - ts}`)
          return false
        } else {
          return item.value
        }
      } catch (err) {
        console.error(err)
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
        // console.log(`get ${key} value. (expireTime: ${expireTime}), now - ts == ${now - ts}`, item.value)
        if (expireTime === 0) {
          return false
        } else {
          return expireTime - (now - ts) // milliseconds
        }
      } catch (err) {
        console.error(err)
      }
      return false
    },
    async removeCache (key) {
      if (empty(key) || this.$localForage === undefined) { return false }
      try {
        await this.$localForage.removeItem(key)
      } catch (err) {
        console.error(err)
      }
      return true
    },
    async clearCache () {
      await this.$localForage.clear()
    },
    log () { this.$config.isDev && console.log(this.time(), ...arguments ) },
    warn () { this.$config.isDev && console.warn(this.time(), ...arguments ) },
    err () { this.$config.isDev && console.error(this.time(), ...arguments ) },
    debug () {
      this.debugMessage = String(arguments[0])
      this.log(arguments)
    }
  }
})
