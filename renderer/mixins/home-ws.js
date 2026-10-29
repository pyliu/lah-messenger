/**
 * @file home-ws.js
 * @description 首頁 WebSocket 通訊核心、重連機制、系統廣播與 ACK 訊息分派 Mixin
 */
import trim from 'lodash/trim'

export default {
  data: () => ({
    wsHost: '',
    wsPort: 8081,
    connecting: false,
    reconnectMs: 20 * 1000,
    syncDepartmentTimer: null,
    checkUnreadTimer: null,
    checkUreadDuration: 3 * 60 * 60 * 1000,
    asking: false
  }),

  computed: {
    wsConnStr () {
      return `ws://${this.wsHost}:${this.wsPort}`
    },

    validHost () {
      return this.$utils.isIPv4(this.wsHost) || this.wsHost === 'localhost'
    },

    validPort () {
      const i = parseInt(trim(this.wsPort))
      return i > 1024 && i < 65535
    },

    showUnreadChannels () {
      return ['announcement', this.adAccount, `announcement_${this.department}`]
    },

    chatUnread () {
      const result = Object.entries(this.unread).reduce((acc, curr) => {
        const isTarget =
          parseInt(curr[0]) > 0 ||
          ['lds', 'adm', 'sur', 'inf', 'reg', 'val', 'acc', 'hr', 'supervisor'].includes(curr[0])
        return isTarget ? acc + curr[1] : acc
      }, 0)
      return result > 99 ? '99+' : result
    },

    showChatUnread () {
      return this.chatUnread > 0 || this.chatUnread === '99+'
    },

    notifyChannels () {
      const channels = ['announcement', `announcement_${this.department}`]
      this.notifySettings.personal && channels.push(this.adAccount)
      this.notifySettings.chat && channels.push('lds')
      this.notifySettings.chat && channels.push(this.department)
      return channels
    }
  },

  watch: {
    currentChannel (nVal, oVal) {
      this.sendChannelUpdate(nVal)
      if (!(nVal in this.messages)) {
        this.$store.commit('addChannel', nVal || this.adAccount)
        this.$store.commit('resetUnread', nVal || this.adAccount)
      }
      this.messages[oVal] && (this.messages[oVal].length = 0)
      this.latestMessage()
      if (!this.showUnreadChannels.includes(nVal)) {
        if (typeof this.delayQueryOnlineClients === 'function') {
          this.delayQueryOnlineClients()
        } else {
          this.queryOnlineClients()
        }
      }
      this.clear()
      this.scrollToBottom()
    },

    wsHost (val) {
      this.resetReconnectTimer()
      if (this.$utils.isIPv4(val) || val === 'localhost' || this.$utils.empty(val)) {
        this.$localForage.setItem('wsHost', val)
        this.$store.commit('apiHost', val)
        this.$store.commit('wsHost', val)
      }
    },

    wsPort (val) {
      this.resetReconnectTimer()
      this.validPort && this.$localForage.setItem('wsPort', val)
    }
  },

  methods: {
    connect () {
      if (this.connected && this.websocket?.readyState === 1) {
        this.resetReconnectTimer()
      } else if (this.validInformation) {
        this.connecting = true
        try {
          if (this.websocket) {
            this.websocket.onopen = null
            this.websocket.onmessage = null
            this.websocket.onerror = null
            this.websocket.onclose = null
            this.websocket.close()
          }

          this.setConnectText('連線中')
          const ws = new WebSocket(this.wsConnStr)

          ws.onopen = () => {
            this.$store.commit('websocket', ws)
            this.log(this.time(), '已連線')
            this.register()
            this.list.length = 0
            this.delayLatestMessage()
            this.setConnectText('已上線')
            this.connecting = false
          }

          ws.onclose = () => {
            this.$store.commit('websocket', undefined)
            this.setConnectText('連線已斷開')
            this.connecting = false
          }

          ws.onerror = (e) => {
            this.$store.commit('websocket', undefined)
            this.setConnectText('WS伺服器連線出錯')
            this.connecting = false
          }

          ws.onmessage = async (e) => this.handleWebSocketMessage(e)
        } catch (e) {
          this.setConnectText('連線初始化失敗')
          this.closeWebsocket()
        }
      }
    },

    async handleWebSocketMessage (e) {
      const incoming = JSON.parse(e.data)
      const channel = incoming.channel
      const receivedId = incoming.message?.id || incoming.id
      const lastReadId = (await this.getChannelLastReadId(channel)) || 0

      const isHistory = !!(incoming.prepend || incoming.message?.prepend)

      if (incoming.type === 'ack') {
        this.handleAckMessage(incoming.message)
      } else if (channel === 'system') {
        this.handleSystemMessage(incoming.message)
      } else if (this.currentChannel === channel) {
        if (!Array.isArray(this.messages[channel])) {
          this.$store.commit('addChannel', channel)
        }
        this.$nextTick(() => {
          if (
            !this.$utils.empty(incoming.message) &&
            !this.messages[channel].find((m) => m.id === incoming.id)
          ) {
            if (isHistory) {
              this.messages[channel].unshift(incoming)
            } else {
              this.messages[channel].push(incoming)
              this.scrollToBottom()
            }

            if (receivedId > lastReadId) {
              this.setChannelUnread(channel, receivedId)
            }

            if (!isHistory) {
              this.triggerNotification(incoming)
              this.delayLatestMessage()
            }
          }
        })
      } else if (incoming.message && incoming.sender !== 'system' && !isHistory) {
        if (
          receivedId > lastReadId &&
          [
            'lds',
            'announcement',
            `announcement_${this.userdept}`,
            this.userid,
            this.userdept
          ].includes(channel)
        ) {
          this.plusUnread(channel)
        }
        this.triggerNotification(incoming)
      }
      const isSelfMessage =
        this.$utils.equal(incoming.sender, this.userid) ||
        (incoming.message &&
          typeof incoming.message === 'object' &&
          this.$utils.equal(incoming.message.sender, this.userid))
      if (isSelfMessage && receivedId > 0 && !isHistory) {
        this.handleCreatedMessageForUpload(channel, receivedId)
      }
      this.connecting = false
    },

    async handleAckMessage (json) {
      const cmd = json?.command
      this.log(this.time(), `處理系統 ACK: ${cmd}`, json)

      switch (cmd) {
        case 'register':
          json.success && this.queryUnreadCount()
          break
        case 'mychannel':
          if (json.success) {
            if (json.payload.action === 'add') this.addChatChannel(json.payload)
            else if (json.payload.action === 'remove') this.removeChatChannel(json.payload)
          }
          break
        case 'remove_channel':
          json.success && this.$store.commit('removeParticipatedChannel', json.payload)
          this.notify(`${json.message}`, { type: json.success ? 'success' : 'warning' })
          break
        case 'remove_message':
          if (json.success) {
            const idx = this.messages[json.payload.channel]?.findIndex(msg => Number(msg.id) === Number(json.payload.id))
            if (idx > -1) this.messages[json.payload.channel].splice(idx, 1)
            const cascade = json.payload.cascade
            if (cascade?.to && cascade?.id && !json.cascadeHandled && !json.payload?.cascadeHandled) {
              this.websocket.send(JSON.stringify({
                type: 'command', sender: this.adAccount, date: this.date(), time: this.time(), channel: 'system',
                message: JSON.stringify({ command: 'remove_message', channel: cascade.to, id: cascade.id, cascade: '' })
              }))
            }
          }
          this.setConnectText(`${json.message}`)
          break
        case 'edit_message':
          if (json.success) {
            const channel = json.payload.channel
            const payload = json.payload.payload
            const found = this.messages[channel]?.find(msg => Number(msg.id) === Number(payload.id))
            if (found) {
              if (channel.startsWith('announcement')) {
                found.message = {
                  ...found.message,
                  title: payload.title,
                  content: payload.content,
                  priority: payload.priority
                }
              } else {
                found.message = payload.message
              }
              const cascade = json.payload.cascade
              if (cascade?.id && cascade?.to && !json.cascadeHandled && !json.payload?.cascadeHandled) {
                this.websocket?.send(JSON.stringify({
                  type: 'command', sender: this.userid, date: this.date(), time: this.time(), channel: 'system',
                  message: {
                    command: 'edit_message', channel: cascade.to, id: cascade.id, sender: this.userid,
                    payload: { ...payload, id: cascade.id, channel: cascade.to, sender: this.userid, title: 'dontcare', message: payload.message?.replaceAll(this.regexpReplyHeader, '') }
                  }
                }))
              }
            }
          }
          break
        case 'previous':
          this.$store.commit('fetchingHistory', false)
          this.setConnectText(`${json.message}(${json.payload.count}筆)`)
          break
        case 'unread':
          this.$store.commit('setUnread', {
            channel: json.payload.channel,
            count: json.payload.unread
          })
          break
        case 'online':
          this.$store.commit(
            'connectedUsers',
            json.payload.users.filter((n) => n)
          )
          break
        case 'private_message': {
          const insertedId = json.payload.insertedId
          const insertedChannel = json.payload.channel
          if (insertedId > 0 && insertedChannel) {
            this.handleCreatedMessageForUpload(insertedChannel, insertedId)
          }
          if (insertedChannel !== this.adAccount && !insertedChannel?.startsWith('announcement') && !this.chatRooms.includes(insertedChannel)) {
            const remove = JSON.stringify({ to: insertedChannel, id: insertedId })
            this.websocket.send(this.packMessage(json.payload.message, {
              channel: this.adAccount, title: remove, priority: 4, flag: 1
            }))
          }
          this.setConnectText(`${json.message}`)
          break
        }
        case 'attachment_uploaded':
        case 'attachment_deleted': {
          const isUploaded = cmd === 'attachment_uploaded'
          const attPayload = json.payload || {}
          const attChannel = attPayload.channel
          const attMsgId = parseInt(attPayload.message_id) || 0
          const newAttachments = attPayload.attachments || []

          const updateMsgAttachments = (msgList) => {
            if (!Array.isArray(msgList)) return false
            const targetIndex = msgList.findIndex((m) => {
              if (m?.id == attMsgId || m?.message?.id == attMsgId) return true
              try {
                const cascade = JSON.parse(m?.remove || m?.title || '{}')
                if (cascade?.to === attChannel && cascade?.id == attMsgId) return true
              } catch (e) {}
              return false
            })
            if (targetIndex > -1) {
              const targetMsg = msgList[targetIndex]
              this.$set(targetMsg, 'attachments', newAttachments)
              if (targetMsg.message && typeof targetMsg.message === 'object') {
                this.$set(targetMsg.message, 'attachments', newAttachments)
              }
              return true
            }
            return false
          }

          updateMsgAttachments(this.messages[attChannel])
          if (attChannel !== this.currentChannel) {
            updateMsgAttachments(this.messages[this.currentChannel])
          }

          const actionText = isUploaded ? '已上傳' : '已刪除'
          const targetFilename = isUploaded
            ? (attPayload.file?.name || '附件')
            : (this.getAttachmentDisplayName(attPayload.filename) || '附件')
          this.setConnectText(`${targetFilename} ${actionText}`)
          break
        }
        case 'set_read':
        case 'check_read': {
          const targetList = cmd === 'set_read' ? this.messages[json.payload.channel] : this.messages[json.payload.sender]
          if (Array.isArray(targetList)) {
            const msgId = cmd === 'set_read' ? json.payload.id : json.payload.senderChannelMessageId
            const found = targetList.find(m => m?.id === msgId)
            if (found && (found.flag & 2) !== 2) found.flag += 2
          }
          break
        }
        case 'update_current_channel':
          this.setConnectText(json.message)
          break
        default:
          console.warn(`收到未支援指令 ${cmd} ACK`, json)
      }
    },

    async handleSystemMessage (json) {
      if (json.command === 'update_user' && json.payload.id) {
        await this.$localForage.setItem('adAccount', json.payload.id)
        await this.$localForage.setItem('adName', json.payload.name)
        await this.$localForage.setItem('department', json.payload.dept)

        try {
          const deptName = this.getDepartmentName(json.payload.dept)
          const cachedInfo = (await this.getCache('apiUserinfo')) || {}
          cachedInfo.unit = deptName
          this.setCache('apiUserinfo', cachedInfo, this.userDataCacheDuration)

          const cachedMap = (await this.getCache('userMapping')) || {}
          cachedMap[json.payload.id] = json.payload.name
          this.setCache('userMapping', cachedMap, this.userDataCacheDuration)
        } catch (err) {
          console.warn('同步更新使用者快取時發生錯誤', err)
        }

        this.ipcRenderer.invoke('reload')
      } else if (['user_connected', 'user_disconnected', 'user_channel_changed'].includes(json.command)) {
        this.log(this.time(), `[系統廣播] 偵測到使用者狀態異動: ${json.command}`, json.payload)

        if (typeof this.delayQueryOnlineClients === 'function') {
          this.delayQueryOnlineClients()
        }

        if (!this.$utils.empty(json.message)) {
          this.setConnectText(json.message)
        }
      }
    },

    async handleCreatedMessageForUpload (channel, messageId) {
      if (!channel || !messageId) return
      const pending = this.pendingAttachmentUploads.filter(
        (item) => item.channel === String(channel)
      )
      if (pending.length === 0) return

      for (const item of pending) {
        this.$store.commit('removePendingAttachmentUpload', item.id)
        for (const file of item.files) {
          try {
            await this.uploadAttachment(channel, messageId, file)
            this.notify(`訊息 #${messageId} 附件 ${file.name} 上傳成功`, {
              type: 'success'
            })
          } catch (err) {
            this.err(`附件 ${file.name} 上傳失敗`, err)
            this.showAttachmentError(file.name, err.message || '後端伺服器拒絕上傳或連線異常')
          }
        }
      }
    },

    register () {
      if (this.websocket?.readyState === 1 && this.validAdAccount && this.validAdName) {
        this.websocket.send(
          this.packCommand({
            command: 'register',
            ip: this.ip,
            domain: this.domain,
            userid: this.adAccount,
            username: this.adName,
            dept: this.department,
            timestamp: +new Date()
          })
        )
      } else {
        if (!this.validAdAccount) {
          console.warn('[register] 非八所正式公務帳號 (需為 H[A-H] 開頭搭配數字)，取消 WebSocket 註冊')
          return
        }
        this.timeout(this.register, 400)
      }
    },

    latestMessage () {
      const channel = this.currentChannel
      if (this.websocket?.readyState === 1 && this.validAdAccount && this.validAdName) {
        this.websocket.send(
          this.packCommand({
            command: 'latest',
            channel: channel,
            count: this.messages[channel]?.length || 0,
            first: this.messages[channel]?.[0]?.id || 0,
            timestamp: +new Date()
          })
        )
      } else {
        this.timeout(this.latestMessage, 400)
      }
    },

    resetReconnectTimer () {
      this.clearReconnectTimer()
      if (this.timer === null && this.$route.name === 'home') {
        this.$store.commit(
          'timer',
          setInterval(() => this.connect(), this.reconnectMs)
        )
      }
    },

    sendChannelUpdate (channel) {
      if (this.websocket?.readyState === 1) {
        this.websocket.send(
          this.packCommand({
            command: 'update_current_channel',
            channel: channel,
            userid: this.adAccount
          })
        )
      }
    },

    addCurrentChannel () {
      if (!(this.currentChannel in this.messages) && !this.$isServer) {
        this.$store.commit('addChannel', this.currentChannel)
        this.$store.commit('resetUnread', this.currentChannel)
      }
    },

    async getChannelLastReadId (c) {
      return (await this.getCache(`${c}_last_id`)) || 0
    },

    setChannelUnread (c, id) {
      this.setCache(`${c}_last_id`, id)
    },

    queryUnreadCount () {
      [
        'announcement',
        `announcement_${this.userdept}`,
        this.adAccount,
        'lds',
        this.userdept
      ].forEach((c) => this.queryChannelUnreadCount(c))
    },

    async queryChannelUnreadCount (c) {
      if (this.websocket?.readyState === 1) {
        this.websocket.send(
          JSON.stringify({
            type: 'command',
            sender: this.adAccount,
            date: this.date(),
            time: this.time(),
            channel: 'system',
            message: JSON.stringify({
              command: 'unread',
              channel: c,
              last: await this.getChannelLastReadId(c)
            })
          })
        )
      }
    },

    addChatChannel (payload) {
      this.$store.commit('addParticipatedChannel', { id: payload.id, name: payload.name, participants: payload.participants, type: payload.type })
    },

    removeChatChannel (payload) {
      this.$store.commit('removeParticipatedChannel', { id: payload.id, name: payload.name, participants: payload.participants, type: payload.type })
    }
  }
}
