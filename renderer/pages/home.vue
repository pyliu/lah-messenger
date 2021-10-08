<template lang="pug">
  div
    transition(v-if="connected" name="list" mode="out-in"): div
      b-card.m-1(no-body header-tag="nav" v-cloak)
        template(#header): b-nav(card-header tabs fill)
          b-nav-item(:active="isAnnouncement" title="全所公告訊息" @click="setCurrentChannel('announcement')"): a.mr-1
            //- b-icon.mr-1(icon="bookmarks-fill" variant="danger")
            span 📢 全所
            b-badge.notify-announcement(variant="danger" pill v-if="showUnread('announcement')") {{ getUnread('announcement') }}

          b-nav-item(
            v-for="(deptChannel, idx) in departmentChannels"
            v-if="deptChannel.value === `announcement_${userdept}`"
            :key="`ann_dept_${idx}`"
            :active="deptChannel.value === currentChannel"
            @click="setCurrentChannel(deptChannel.value)"
            title="部門公告訊息"
          ): a.mr-1
            //- b-icon.mr-1(icon="building" variant="primary")
            span 🏛️ {{ deptChannel.text }}
            b-badge.notify-dept(variant="info" pill v-if="showUnread(deptChannel.value)") {{ getUnread(deptChannel.value) }}
          
          b-nav-item(:active="isPersonal" :title="`${userid} 個人通知訊息`" @click="setCurrentChannel(userid)"): a.mr-1
            //- b-icon.mr-1(icon="person-square" variant="primary")
            span 😎 個人
            b-badge.notify-personal(variant="success" pill v-if="showUnread(userid)") {{ getUnread(userid) }}

          b-nav-item(:active="isChat" title="聊天室列表" @click="setCurrentChannel('chat')"): a.mr-1
            //- b-icon.mr-1(icon="chat-dots-fill" variant="muted")
            span 💬 聊天室
            b-badge.notify-chat(variant="secondary" pill v-if="showChatUnread") {{ chatUnread }}

          b-nav-item(title="進入設定頁面"): nuxt-link(to="/settings")
            b-icon.mr-1(icon="list")

        //- chatting control bar
        transition(name="list" mode="out-in"): b-list-group.my-1(v-if="inChatting" flush): b-list-group-item: b-link.d-flex.justify-content-between.align-items-center(@click="setCurrentChannel('chat')")
          .mr-auto
            b-icon.mr-1(icon="arrow-left-circle-fill" font-scale="1.25" title="返回列表")
            span {{ getChannelName($store.getters.currentChannel) }} 
          
          //- show online user badges
          b-avatar-group.mr-4(v-if="connectedUsersCount > 1" size="2rem" :overlap="connectedUsersOverlapRatio")
            user-avatar(
              v-for="(user, idx) in connectedUsers"
              v-if="idx < 13"
              :key="`connected_user_${user.userid}_${idx}`"
              :user-data="user"
            )
          span.mr-4(v-if="connectedUsersCount >= 13") +{{ connectedUsersCount - 13 }}
          user-avatar.mr-4(
            v-if="connectedUsersCount === 1"
            :user-data="connectedUsers[0]"
          )

        //- chatting channel board
        transition(name="list" mode="out-in"): chat-board(v-if="showChatBoard")

        //- main message display board
        transition(name="list" mode="out-in"): message-board(v-if="showMessageBoard" :list="list" @reply="reply")

      //- 輸入訊息UI
      transition(name="listY" mode="out-in"): b-input-group.p-1(
        v-if="showInputGroup"
        size="sm" 
        style="position:relative"
        @keyup.esc.exact="emoji = false"
      )
        b-textarea(
          ref="textarea"
          v-model="inputText"
          placeholder="... Ctrl + Enter 送出 ... Ctrl + V 剪貼簿貼圖 ... ESC鍵清除 ..."
          @keyup.enter.ctrl="send"
          @keyup.enter.shift="send"
          @keyup.enter.alt="send"
          @keyup.esc="clear"
          @keydown="delayConnect"
          @paste="pasteImage($event, pasted)"
          no-resize
          no-auto-shrink
          autofocus
        )
        b-button.ml-1(@click="send" :variant="valid ? 'primary' : 'outline-primary'" :disabled="!valid" title="傳送")
          b-icon(icon="cursor" rotate="45")
        b-button.mx-1(@click="emojiPickup" variant="outline-secondary" :title="`挑選表情 ${emojiCode} => ${emojiTxt}`") #[span.h5 {{ emojiTxt }}]
        b-button(@click="pick" variant="outline-success" title="傳送圖片")
          b-icon(icon="image")
        lah-transition: .d-flex.justify-content-between.p-2.float-preview.preview(v-if="!empty(inputText) || !empty(this.inputImages)" ref="floatPreview")
          span.text-white.font-weight-bold 預覽
          message.my-message(:raw="messagePreviewJson" style="opacity: 1 !important;")
        lah-transition(fade): .float-emoji(v-if="emoji")
          emoji-pickup(@click="addEmoji")


    //- 連線主畫面
    .center.vh-100(v-else v-cloak)
      .w-75
        .center.logo: b-img(id="main_logo" src="taoyuan_logo.png" v-cloak)

        .center(style="margin-top:3rem;"): b-iconstack.iconstack(id="main_logo_icon" font-scale="7.5" v-cloak)
          b-icon(icon="chat-dots" variant="success" flip-h shift-h="10" shift-v="3" stacked)
          b-icon(icon="chat-text" variant="info" shift-h="-10" shift-v="6" stacked)

        .center.d-flex.my-2(title="連線使用者資訊")
          b-input-group
            template(#prepend): b-icon.my-auto.mr-1(icon="person-badge" font-scale="2.25" variant="secondary")
            b-button(
              id="nametag"
              title="開啟登入視窗"
              @click="showModalById('ad-query-modal')"
              :variant="queryADVariant"
              :disabled="asking || this.empty(this.userid)"
            )
              b-icon.mr-1(v-if="this.userid === this.nickname" icon="box-arrow-in-right" font-scale="1.25")
              span.my-auto {{ queryADLabel }}
              
            b-input.ml-1(v-model="nickname" placeholder="... 顯示姓名 ..." trim readonly)
            b-modal(
              id="ad-query-modal"
              hide-footer
              centered
              scrollable
              no-close-on-backdrop
            )
              template(#modal-title): div(v-html="`AD驗證登入 ${userid}`")
              b-input-group.ml-1.mb-1(title="AD伺服器IP")
                template(#prepend): .mr-1.my-auto ＡＤ主機
                b-input(v-model="adHost" placeholder="... AD伺服器IP ..." :state="validAdHost" trim)
              b-input-group.ml-1(:title="`${userid}的網域密碼`")
                template(#prepend): .mr-1.my-auto 網域密碼
                b-input(:type="adPasswordType" v-model="adPassword" :state="validAdPassword" :placeholder="`網域密碼`" trim @keydown.enter="invokeADQuery(true)")
                b-icon.my-auto.ml-2.eye(ref="eye" :icon="adPasswordIcon" font-scale="1.25" variant="secondary" @click="switchAdPasswordIcon" :style="'margin-right: 60px'")
                b-button.ml-1(:title="`點擊重新查詢 ${userid}`" @click="invokeADQuery(true)" :variant="'outline-primary'" :disabled="empty(adPassword) || validAdHost === false") 登入
        
        .center.d-flex.my-2
          b-input-group
            template(#prepend): b-icon.my-auto.mr-1(icon="building" font-scale="2.25" variant="secondary")
            b-select(v-model="department" :options="departmentOpts" :state="validDepartment" title="選擇所屬部門" disabled)

        b-input-group.my-2(title="信差伺服器資訊")
          template(#prepend): b-icon.my-auto.mr-1(icon="chat" font-scale="2.25" variant="secondary")
          b-input(v-model="wsHost" @keyup.enter.exact="manualConnect" :state="validHost" trim placeholder="... 信差伺服器IP ...")
          span.my-auto.mx-1 :
          b-input(v-model="wsPort" type="number" min="1025" max="65535" :state="validPort" style="max-width: 75px;")

        transition.text-center(
          enter-active-class="animate__slideInUp"
          leave-active-class="animate__slideInDown"
          mode="out-in"
        ): b-button.animate__animated(
          v-if="validInformation"
          @click="manualConnect"
          :disabled="connecting"
          variant="success"
          block
        )
          b-icon(v-if="connecting" icon="arrow-clockwise" animation="spin-pulse")
          span(v-else) #[b-icon.my-auto(icon="box-arrow-in-right" font-scale="1")] 連線


    //- 狀態列
    status(:status-text="connectText")
</template>

<script>
import trim from 'lodash/trim'
import isEmpty from 'lodash/isEmpty'
import debounce from 'lodash/debounce'
import ImageUpload from '~/components/image-upload.vue'
import DOMPurify from 'dompurify'
import Markd from 'marked'

export default {
  transition: 'list',
  head: { title: `桃園地政事務所` },
  components: { ImageUpload },
  data: () => ({
    emoji: false,
    image: null,
    inputText: '',
    inputImages: [],
    connectText: '',
    adHost: '',
    adPassword: '',
    adPasswordIcon: 'eye-slash',
    adPasswordType: 'password',
    wsHost: '',
    wsPort: 8081,
    nickname: '',
    department: '',
    departmentOpts: [
      { value: '', text: '選擇部門' },
      { value: 'reg', text: '登記課' },
      { value: 'inf', text: '資訊課' },
      { value: 'adm', text: '行政課' },
      { value: 'sur', text: '測量課' },
      { value: 'val', text: '地價課' },
      { value: 'hr', text: '人事室' },
      { value: 'acc', text: '會計室' },
      { value: 'supervisor', text: '主任秘書室' },
    ],
    departmentChannels: [
      { value: 'announcement_inf', text: '資訊' },
      { value: 'announcement_adm', text: '行政' },
      { value: 'announcement_reg', text: '登記' },
      { value: 'announcement_sur', text: '測量' },
      { value: 'announcement_val', text: '地價' },
      { value: 'announcement_hr', text: '人事' },
      { value: 'announcement_acc', text: '會計' },
      { value: 'announcement_supervisor', text: '主任秘書' },
    ],
    connecting: false,
    asking: false,
    reconnectMs: 20 * 1000,
    back: false
  }),
  async fetch () {
    // restore image memento
    this.$localForage.getItem(this.imageMementoCacheKey).then((arr) => {
      this.log('回復已上傳的圖檔', `${arr?.length}筆`)
      this.$store.commit('imageMemento', arr || [])
    })
    // restore message memento
    this.$localForage.getItem(this.messageMementoCacheKey).then((arr) => {
      this.log('回復已儲存的訊息', arr)
      this.$store.commit('messageMemento', arr || [])
    })
  },
  computed: {
    connectedUsersOverlapRatio () {
      return this.connectedUsers.length < 13 ? 0.0 : 0.4
    },

    showInputGroup () { return !this.currentChannel.startsWith('announcement') && this.currentChannel !== this.userid && this.currentChannel !== 'chat' },
    showMessageBoard () { return this.currentChannel !== 'chat' },
    showChatBoard () { return this.isChat },

    isChat () { return !this.currentChannel.startsWith('announcement') && !this.isPersonal },
    isPersonal () { return this.userid === this.currentChannel },
    isAnnouncement () { return this.currentChannel === 'announcement' },
    isInf () { return this.currentChannel === 'inf' },
    isAdm () { return this.currentChannel === 'adm' },
    isVal () { return this.currentChannel === 'val' },
    isReg () { return this.currentChannel === 'reg' },
    isSur () { return this.currentChannel === 'sur' },
    isAcc () { return this.currentChannel === 'acc' },
    isHr () { return this.currentChannel === 'hr' },
    isSupervisor () { return this.currentChannel === 'supervisor' },
    isLds () { return this.currentChannel === 'lds' },

    wsConnStr () { return `ws://${this.wsHost}:${this.wsPort}` },
    // load user authority from API server, but need to wait apiQueryUrl updated in the mounted method
    userQueryStr () { return `${this.apiQueryUrl}${this.$consts.API.JSON.USER}` },
    valid () { return !this.empty(trim(this.inputText)) || !this.empty(this.inputImages) },
    validAdHost () { return this.$utils.isIPv4(this.adHost) === false ? false : null },
    validAdPassword () { return this.empty(this.adPassword) ? false : null },
    validHost () { return this.$utils.isIPv4(this.wsHost) === false ? false : null },
    validPort () {
      const i = parseInt(trim(this.wsPort))
      return i < 1025 || i > 65535 || this.empty(this.wsPort) ? false : null
    },
    validDepartment () { return isEmpty(trim(this.department)) === true ? false : null },
    validInformation () { return !isEmpty(this.userid) && this.validDepartment === null && this.validPort === null && this.validHost === null },
    list () {
      return this.messages[this.currentChannel] || []
    },

    stickyChannels () { return ['announcement', this.userid, 'chat', ...this.departmentChannels.map(item => item.value) ] },
    showUnreadChannels () { return ['announcement', this.userid, , `announcement_${this.department}`] },
    inChatting () { return !this.stickyChannels.includes(this.currentChannel) },
    
    showChatUnread () {
      return this.chatUnread > 0 || this.chatUnread === '99+'
    },
    chatUnread () {
      const result =  Object.entries(this.unread).reduce((acc, curr) => {
        if (parseInt(curr[0]) > 0 || ['lds', 'adm', 'sur', 'inf', 'reg', 'val', 'acc', 'hr', 'supervisor'].includes(curr[0])) {
          return acc + curr[1]
        }
        return acc
      }, 0)
      return result > 99 ? '99+' : result
    },
    queryADLabel () { return this.userid === this.nickname ? '登入' : this.userid },
    queryADVariant () {
      if (this.empty(this.nickname)) { return 'outline-danger' }
      return this.nickname === this.userid ? 'outline-primary' : 'success'
    },
    backFromSettings () { return this.$route.query.reconnect === 'true' },
    notifyChannels () {
      const channels = ['announcement', `announcement_${this.department}`]
      this.notifySettings.personal && channels.push(this.userid)
      // add chatting channel to the list
      this.notifySettings.chat && channels.push('lds')
      this.notifySettings.chat && channels.push(this.department)
      return channels
    },
    
    markdImages () {
      let imgMdText = this.inputImages.map((base64, idx) => {
        return `![preview-${idx}](${base64})`
      }).join('<hr style="margin:5px"/>')
      if (!this.empty(this.inputText) && !this.empty(imgMdText)) {
        imgMdText = `<hr style="margin:5px"/> ${imgMdText}`
      }
      return imgMdText
    },
    markdMessage () {
      if (this.empty(this.inputText) && this.empty(this.inputImages)) { return '' }
      // markd treat '\s{2}\n' to break line
      return DOMPurify?.sanitize(Markd(`${this.inputText}${this.markdImages}`.replaceAll('\n', '  \n')))
    },
    messagePreviewJson () {
      return {
        id: 0,
        channel: this.to,
        date: this.date(),
        time: this.time(),
        message: this.markdMessage,
        prepend: false,
        sender: this.userid,
        type: "mine"
      }
    }
  },
  watch: {
    connectText (val) {
      this.$store.commit('statusText', val)
    },
    currentChannel(nVal, oVal) {
      this.log(`離開 ${oVal} 頻道，進入 ${nVal} 頻道`)
      // comment out to prevent mess in/out system message in chat room
      // this.delaySendChannelActivity(oVal, nVal)

      if (!(nVal in this.messages)) {
        this.$store.commit("addChannel", nVal || this.userid)
        this.log(this.time(), `add channel ${nVal} to $store!`)
        this.$store.commit("resetUnread", nVal || this.userid)
        this.log(this.time(), `add unread ${nVal} to $store!`)
      }
      
      // release from channel items
      this.messages[oVal] && (this.messages[oVal].length = 0)
      this.latestMessage()

      // chatting needs to query online users to show avatar
      if (!this.showUnreadChannels.includes(nVal)) {
        this.queryChatChannelOnlineClients()
      }
      // clear the input UI content
      this.clear()
    },
    wsHost(val) {
      this.resetReconnectTimer()
      this.$localForage.setItem('wsHost', val)
    },
    wsPort(val) {
      this.resetReconnectTimer()
      this.$localForage.setItem('wsPort', val)
    },
    nickname(val) {
      this.$store.commit('username', val)
      this.$localForage.setItem('nickname', val)
    },
    adHost(val) {
      this.$store.commit('ad', val)
      this.$localForage.setItem('adHost', val)
    },
    adPassword(val) {
      this.$store.commit('password', val)
      this.$localForage.setItem('adPassword', val)
    },
    department(val) {
      this.resetReconnectTimer()
      this.$store.commit('userdept', val)
      this.$localForage.setItem('department', val)
    },
    fetchingHistory(flag) {
      this.isBusy = flag
    },
    inputImages (dontcare) {
      this.timeout(() => {
        if (this.$refs.floatPreview) {
          this.$refs.floatPreview.style.top = '-' + this.$refs.floatPreview.offsetHeight + 'px'
        }
      }, 100)
    },
    inputText (dontcare) {
      this.$nextTick(() => {
        if (this.$refs.floatPreview) {
          this.$refs.floatPreview.style.top = '-' + this.$refs.floatPreview.offsetHeight + 'px'
        }
      })
    },
    authority (val) { this.warn(val) }
  },
  methods: {
    delaySendChannelActivity: function noop () {},
    delayConnect () { /* placeholder */ },
    delayLatestMessage () { /* placeholder */ },
    clear () {
      this.inputText = ''
      this.inputImages = []
    },
    pasted (base64) {
      !this.inputImages.includes(base64) && this.inputImages.push(base64)
    },
    removeInoutImage (base64data) {
      const index = this.inputImages.indexOf(base64data)
      if (index > -1) {
        this.inputImages.splice(index, 1)
      }
    },
    emojiPickup () {
      this.emoji = !this.emoji
    },
    addEmoji (emoji) {
      this.emoji = false
      this.inputText = this.inputText + emoji
      this.$refs.textarea?.focus()
    },
    pick () {
      this.modal(this.$createElement(ImageUpload, {
        props: {
          to: this.currentChannel,
          modalId: 'image-upload-modal'
        },
        on: {
          publish: (base64EncodedData) => {
            // received publish event from image-upload component
            this.sendImage(base64EncodedData, '上傳圖片', this.currentChannel)
          }
        }
      }), {
        id: 'image-upload-modal',
        size: 'xl',
        title: `直接傳送圖片`
      })
    },
    loadAuthority () {
      this.$axios.post(this.userQueryStr, {
        type: 'authentication',
        ip: this.ip
      }).then(({ data }) => {
        if (this.$utils.statusCheck(data.status)) {
          this.$store.commit('authority', data.authority)
          this.setCache('userAuthority', data.authority, 12 * 60 * 60 * 1000)
        } else {
          this.warning(data.message)
        }
      }).catch((err) => {
        this.alert(err.toString())
      }).finally(() => {
        this.log('authority', this.authority)
      })
    },
    loadUserMapData () {
      // refresh user name mapping from API server
      this.$axios.post(this.userQueryStr, {
        type: 'user_mapping'
      }).then(({ data }) => {
        if (this.$utils.statusCheck(data.status)) {
          this.$store.commit('userMap', data.data)
          this.setCache('userMap', data.data, 12 * 60 * 60 * 1000)
        } else {
          this.warning(data.message)
        }
      }).catch((err) => {
        this.alert(err.toString())
      }).finally(() => {
      })
    },
    reply (raw) {
      const sender = this.userMap[raw["sender"]] || raw["sender"]
      const hrIdx = raw["message"]?.indexOf('<hr>')
      const text = hrIdx === -1 ? raw['message'] : raw['message'].substring(hrIdx+4)
      const tmp = document.createElement('DIV')
      tmp.innerHTML = `@${sender} ${text}`
      let innerText = tmp.textContent || tmp.innerText || ''
      if (this.$utils.length(innerText) > 20) {
        innerText = innerText.substring(0, 20) + ' ... '
      }
      this.inputText = `${innerText}\n***\n`
      this.$nextTick(() => {
        this.$refs.textarea.$el.scrollTop = 999999
        this.$refs.textarea?.focus()
      })
    },
    switchAdPasswordIcon() {
      if (this.adPasswordIcon === 'eye') {
        this.adPasswordIcon = 'eye-slash'
        this.adPasswordType = 'password'
      } else {
        this.adPasswordIcon = 'eye'
        this.adPasswordType = 'text'
      }
    },
    sendChannelActivity(oVal, nVal) {
      if (this.connected) {
        this.log(`準備送出 ${oVal} / ${nVal} 活動訊息`)
        // delaySendChannelActivity will debounce 5000ms then checking if it need to send the message 
        const oCName = this.getChannelName(oVal)
        const nCName = this.getChannelName(nVal)
        !this.stickyChannels.includes(oVal) && this.currentChannel !== oVal && this.sendTo(`${this.username || this.userid} 離開 ${oCName} 頻道`, { sender: 'system', channel: oVal })
        !this.stickyChannels.includes(nVal) && this.currentChannel === nVal && this.sendTo(`${this.username || this.userid} 進入 ${nCName} 頻道`, { sender: 'system', channel: nVal })
      }
    },
    sendAppCloseActivity() {
      const cName = this.getChannelName(this.currentChannel)
      !this.stickyChannels.includes(this.currentChannel) && this.sendTo(`${this.username || this.userid} 離開 ${cName} 頻道 (程式已關閉)`, { sender: 'system', channel: this.currentChannel })
    },
    send () {
      // detect local commands
      const text = trim(this.inputText)
      if (text === '@clearCache') {
        this.$localForage.clear().then((params) => {
          this.notify(`本機記憶資料已清除`, { type: 'success' })
        })
      } else if (text === '@settings') {
        this.$router.push('/settings')
      }

      if (this.sendTo(this.markdMessage, { channel: this.currentChannel })) {
        this.clear()
      }
      this.$refs.textarea && this.$refs.textarea.focus()
    },
    sendTo(message, opts = {}) {
      message = trim(message)
      !this.connected && this.connect()
      if (!isEmpty(message)) {
        if (this.connected) {
          const jsonStr = this.packMessage(message, { channel: this.currentChannel, ...opts })
          this.websocket.send(jsonStr)
          return true
        } else {
          this.notify(`伺服器連線${this.status(
            this.websocket.readyState
          )} ... 無法傳送訊息`, { type: 'warning', pos: 'tf' })
        }
      }
      return false
    },
    status(code) {
      switch (code) {
        case 0:
          return "連線中"
        case 1:
          return "已連線"
        case 2:
          return "關閉中"
        case 3:
          return "已關閉"
        default:
          return `未定義的代碼(${code})`
      }
    },
    register() {
      if (this.connected) {
        const jsonString = JSON.stringify({
          type: "command",
          sender: this.userid,
          date: this.date(),
          time: this.time(),
          message: JSON.stringify({
            command: 'register',
            ip: this.ip,
            domain: this.domain,
            userid: this.userid,
            username: this.nickname,
            dept: this.department,
            timestamp: +new Date()
          }),
          channel: 'system'
        })
        this.websocket.send(jsonString)
        // also update IP entry to API server
        this.reportToAPIServer()
      } else {
        this.log(
          this.time(),
          "尚未連線無法登錄客戶端資料", {
            ip: this.ip,
            domain: this.domain,
            userid: this.userid,
            username: this.nickname,
            dept: this.department,
          }
        )
      }
    },
    reportToAPIServer () {
      this.ipcRenderer.invoke('add-ip-entry', {
        api: `${this.apiQueryUrl}${this.$consts.API.JSON.IP}`,
        type: 'add_user_ip_entry',
        note: `${this.domain} ${this.department}`,
        added_type: 'DYNAMIC',
        entry_type: 'USER',
        entry_id: this.userid,
        entry_desc: this.nickname
      })
    },
    async getChannelUnread (channel) {
      return await this.getCache(`${channel}_last_id`) || 0
    },
    setChannelUnread (channel, unreadId) {
      this.setCache(`${channel}_last_id`, unreadId)
    },
    queryStickyChannelUnreadCount () {
      this.queryChannelUnreadCount('announcement')
      this.queryChannelUnreadCount(`announcement_${this.userdept}`)
      this.queryChannelUnreadCount(this.userid)
    },
    async queryChannelUnreadCount (channel) {
      const jsonString = JSON.stringify({
        type: "command",
        sender: this.userid,
        date: this.date(),
        time: this.time(),
        message: JSON.stringify({
          command: 'unread',
          channel: 'channel',
          last: this.getChannelUnread(channel)
        }),
        channel: 'system'
      })
      this.websocket.send(jsonString)
    },
    queryMyChannel () {
      const jsonString = JSON.stringify({
        type: "command",
        sender: this.userid,
        date: this.date(),
        time: this.time(),
        message: JSON.stringify({ command: 'mychannel' }),
        channel: 'system'
      })
      this.websocket.send(jsonString)
    },
    handleAckMessage (json) {
      const cmd = json.command
      this.log(this.time(), `處理系統 ACK 訊息 ${cmd} [home::handleAckMessage]`, json)
      switch (cmd) {
        case 'register':
          json.success && this.queryMyChannel() && this.queryStickyChannelUnreadCount()
          break;
        case 'mychannel':
          if (json.success) {
            const payload = json.payload
            switch (payload.action) {
              case 'add':
                this.addChatChannel(payload)
                break;
              case 'remove':
                this.removeChatChannel(payload)
                break;
              default:
                console.warn(`不支援的 mychannel ACK 動作 ${payload.action}`)
            }
          }
          break;
        case 'remove_channel':
          const item = json.payload
          json.success && this.$store.commit('removeParticipatedChannel', item)
          this.notify(`${json.message}`, { type: json.success ? 'success' : 'warning' })
          break;
        case 'remove_message':
          if (json.success && this.messages[json.payload.channel]) {
            let found_idx = -1
            const found = this.messages[json.payload.channel].find((msg, idx) => {
              found_idx = idx
              return msg.id === json.payload.id
            })
            if (found_idx > -1) {
              this.messages[json.payload.channel].splice(found_idx, 1)
            }
            this.log(json.message)
            // this.notify(`移除訊息成功 (#${json.payload.id})`, { type: 'success' })
          } else {
            this.err(json)
            this.alert(`${json.message}`)
          }
          this.connectText = `${json.message}`
          break;
        case 'previous':
          this.$store.commit('fetchingHistory', false)
          !json.success && this.notify(json.message, { subtitle: this.getChannelName(json.payload.channel), type: 'info'})
          this.connectText = `${json.message}(${json.payload.count}筆)`
          break;
        case 'unread':
          this.$store.commit('setUnread', {
            channel: json.channel,
            count: json.count
          })
          this.connectText = `${json.message}`
          break;
        case 'online':
          this.$store.commit('connectedUsers', json.payload.users)
          this.connectText = `${json.message}`
          break;
        default:
          console.warn(`收到未支援指令 ${cmd} ACK`, json)
      }
    },
    addChatChannel(payload) {
      this.$store.commit('addParticipatedChannel', {
        id: payload.id,
        name: payload.name,
        participants: payload.participants,
        type: payload.type // 0 => 1-1, 1 => group, 2 => dept
      })
    },
    removeChatChannel(payload) {
      this.$store.commit('removeParticipatedChannel', {
        id: payload.id,
        name: payload.name,
        participants: payload.participants,
        type: payload.type
      })
    },
    handleSystemMessage (json) {
      const action = json.action
      this.log(this.time(), `處理系統訊息 ${action} [home::handleSystemMessage]`, json)
      switch (action) {
        default:
          this.log(this.time(), `未支援的命令 ${action}`, json)
      }
      
    },
    manualConnect() {
      this.connecting = true
      this.resetReconnectTimer()
      this.delayConnect()
    }, 
    connect () {
      if (this.connected) {
        this.log(this.time(), "已連線，略過檢查")
        this.connectText = ''
        this.reconnectMs = 20 * 1000
        this.resetReconnectTimer()
      } else {
        if (this.validInformation) {
          this.connecting = true
          try {
            this.websocket && this.websocket.close()
            this.connectText = '連線中'
            const ws = new WebSocket(this.wsConnStr)
            ws.onopen = (e) => {
              // ws to Vuex store
              this.$store.commit('websocket', ws)
              this.log(this.time(), "已連線", e)
              // set client info to remote ws server
              this.register()

              // query current channel latest messages
              this.list.length = 0
              this.delayLatestMessage()

              this.connectText = '已上線'
              this.connecting = false
            }
            ws.onclose = (e) => {
              this.$store.commit('websocket', undefined)
              this.$config.isDev && console.warn(this.time(), "WS伺服器連線已關閉", e)
              this.connecting = false
              this.connectText = `等待重新連線中(${this.wsConnStr})`
            }
            ws.onerror = (e) => {
              this.$store.commit('websocket', undefined)
              this.$config.isDev && console.warn(this.time(), "WS伺服器連線出錯", e)
              this.connectText = `'WS伺服器連線出錯'`
              this.connecting = false
              this.alert(`WS伺服器連線有問題`, { pos: 'tf', subtitle: this.wsConnStr })
            }
            ws.onmessage = async (e) => {
              const incoming = JSON.parse(e.data)
              const channel = incoming.channel

              const receivedId = incoming.message.id || incoming.id
              const lastReadId = await this.getChannelUnread(channel)

              this.log(`現在頻道 ${channel}`, `收到ID ${receivedId}`, `最後讀取ID ${lastReadId}`, incoming)

              this.connectText = `收到 ${this.getChannelName(channel)} 訊息`
              this.log(this.time(), `現在 ${this.currentChannel} 頻道收到 ${channel} 頻道的 #${incoming['id']} 資料`, incoming)

              if (incoming.type === 'ack') {
                this.handleAckMessage(incoming.message)
              } else if (channel === 'system') {
                // got system message
                this.handleSystemMessage(incoming.message)
              } else if (this.currentChannel === channel) {
                // add empty array if store does not have it
                !Array.isArray(this.messages[channel]) && this.$store.commit("addChannel", channel)
                this.$nextTick(() => {
                  // add message to store channel list
                  if(!isEmpty(incoming.message)) {
                    if (incoming.prepend) {
                      this.messages[channel].unshift(incoming)
                    } else {
                      // prevent to add duplicated message
                      const found = this.messages[channel].find((msg, idx) => {
                        return msg.id === incoming.id
                      })
                      if (!found) {
                        this.messages[channel].push(incoming)
                        // only recieved id is greater than read id that needs to insert to current message list
                        if (receivedId > lastReadId) {
                          // store the read id for this channel at FE
                          this.setChannelUnread(channel, receivedId)
                          // tell electron window got a unread message
                          this.ipcRenderer.invoke('unread', channel)
                          // current channel received message send notification
                          this.invokeNotification(incoming)
                        }
                      }
                    }
                  }
                })
              } else if (incoming.message && incoming.sender !== 'system') {
                // add unread stats
                if (parseInt(this.unread[channel]) === NaN) {
                  this.resetUnread(channel)
                }
                // channel got new message then pluses the counter
                if (receivedId > lastReadId) {
                  this.currentChannel !== channel && this.plusUnread(channel)
                  if (this.showUnreadChannels.includes(channel)) {
                    // tell electron window the channels got unread message
                    this.ipcRenderer.invoke('unread', channel)
                    // determining wether the message should trigger the system notification
                    this.invokeNotification(incoming)
                  }
                }
              }
              
              this.connecting = false
            }
          } catch (e) {
            this.connectText = '連線錯誤'
            console.error(e)
            this.closeWebsocket()
          } finally {
            // delay to reset the back flag (control login panel)
            setTimeout(() => this.back = false, 1000)
          }
        } else {
          const IDReady = !isEmpty(this.userid)
          this.notify(IDReady ? '請輸入正確的連線資訊' : '正在等待取得登入ID ... ', { type: IDReady ? 'warning' : 'info', pos: 'tf', delay: 3000 })
          if (this.reconnectMs < 640 * 1000) {
            this.reconnectMs *= 2
            this.resetReconnectTimer()
          }
          // send notification to user to login
          this.ipcRenderer.invoke('notification', {
            message: '請登入網域以讀取最新訊息！',
            showMainWindow: true
          })
        }
      }
    },
    latestMessage() {
      const channel = this.currentChannel
      if (this.connected) {
        const jsonString = JSON.stringify({
          type: "command",
          sender: this.userid,
          date: this.date(),
          time: this.time(),
          message: JSON.stringify({
            command: 'latest',
            channel: channel,
            count: 10
          }),
          channel: 'system'
        })
        this.websocket.send(jsonString)
      } else {
        this.log(
          this.time(),
          `尚未連線無法取得 ${channel} 最新訊息資料`
        )
      }
    },
    resetReconnectTimer () {
      // reset timer if it already settled
      this.clearReconnectTimer()
      // in home.vue, checks connection every 20s (default)
      if (this.timer === null && this.$route.name === 'home') {
        this.log(this.time(), "啟動重新連線檢查定時器", this.reconnectMs / 1000, 'secs')
        this.$store.commit('timer', setInterval(() => {
          this.log(this.time(), "檢查連線狀態 ... ")
          this.connectText = '檢查連線狀態'
          this.connect()
        }, this.reconnectMs))
      }
    },
    async invokeNotification (incoming) {
      const channel = incoming.channel
      this.log(this.time(), '確認是否需要傳送通知', channel)
      if (this.notifyChannels.includes(channel)) {
        /**
         * expect announcement incoming message format:
         * {
         *    channel: "announcement_inf"
         *    date: "2021-09-02"
         *    from: "220.1.34.75"
         *    id: 1
         *    message: {
         *      content: "目標：穩定(確保機房及系統正常運作) ..."
         *      create_datetime: "2021-08-25 15:52:19"
         *      expire_datetime: ""
         *      flag: 0
         *      from_ip: "192.168.xx.xx"
         *      id: 1
         *      priority: 2
         *      sender: "HA10000000"
         *      title: "xxxxxxx"
         *    }
         *    prepend: false
         *    sender: "系統推播"
         *    time: "17:26:01"
         *    type: "remote"
         * }
         * 
         * expect personal incoming message format:
         * {
         *   channel: "HA10013859"
         *   date: "2021-09-02"
         *   id: 16
         *   message: "<p>眾所矚目由鴻海、台積電、慈濟共同採購的首批93.2萬劑BNT疫苗今...</p>"
         *   prepend: false
         *   sender: "HA10013859"
         *   time: "17:17:13"
         *   type: "remote"
         * }
         */
        const cacheKey = `${channel}_last_id`
        const id =  incoming.message.id || incoming.id
        let title = incoming.message.title || incoming.message

        // remove all html tags (will generate by Markd)
        const temp = document.createElement("div")
        temp.innerHTML = title
        title = temp.innerText.substring(0, 18) + ' ... '

        let lastReadId = parseInt(await this.getCache(cacheKey)) || 0
        this.log(`收到 ${channel} 頻道訊息`, `現在收到id: ${id}`, `上次讀過id: ${lastReadId}`, title)
        if (id > lastReadId) {
          this.setCache(cacheKey, id)
          // sender not me then triggers notification
          incoming.sender !== this.userid && this.invokeIPCNotification(title, {
            showMainWindow: true,
            channel: channel
          })
        }
      }
    },
    invokeADQuery (force = false) {
      if (this.asking === true) {
        this.connectText = `AD查詢中`
        return
      }
      if (this.empty(this.adPassword) || this.validAdHost === false) {
        this.connectText = `缺漏必要欄位無法查詢`
        return
      }
      // hide modal window
      this.hideModalById('ad-query-modal')
      this.nickname = this.userMap[this.userid] || this.userid
      if (force || (this.nickname === this.userid && !this.empty(this.adPassword) && !this.empty(this.domain) && this.$utils.isIPv4(this.adHost))) {
        this.asking = true
        this.log(this.time(), `透過AD查詢使用者資訊`)
        const sAMAccountName = `${this.userid}@${this.domain}`
        this.ipcRenderer.invoke('ad-user-query', {
          url: `ldap://${this.adHost}`,
          baseDN: `DC=${this.domain.split('.').join(',DC=')}`, // 'DC=PCNAME,DC=HA,DC=CENWEB,DC=LAND,DC=MOI'
          username: sAMAccountName,
          password: this.adPassword
        }).then((result) => {
          const group = result.group
          const desc = result.description
          this.log(this.time(), `查到 ${sAMAccountName} 描述`, desc)
          this.log(this.time(), `查到 ${sAMAccountName} 部門`, group)
          const name = desc || this.userMap[this.userid] || this.userid
          this.$store.commit('username', name)
          this.$localForage.setItem('nickname', name)
          this.nickname = name
          this.department = group
          this.connectText = `AD: ${this.userid} ${name} ${group}`
          this.connect()
        }).catch((err) => {
          console.error(err)
          this.alert(`AD查詢失敗，密碼錯誤!?`, { title: `ldap://${this.adHost}`, subtitle: sAMAccountName })
        }).finally(() =>{
          this.log(this.time(), `透過AD查詢使用者中文姓名結束`)
          this.asking = false
        })
      }
    },
    queryUserInfo () {
      // dynamic get userinfo from main process
      this.$localForage.getItem('userinfo').then(userinfo => {
        // console.log('使用者資訊除錯', userinfo)
        if (userinfo) {
          this.setUserInfo(userinfo)
        } else {
          this.ipcRenderer.invoke('userinfo').then((userinfo) => {
            this.setUserInfo (userinfo)
          })
        }
      })
    },
    setUserInfo (userinfo) {
      this.$store.commit('userinfo', userinfo)
      this.$localForage.setItem('userinfo', userinfo)
      if (!this.$utils.isIPv4(this.adHost)) {
        this.adHost = this.getFirstDNSIp()
      }
      if (this.userid === this.username) {
        this.ipcRenderer.invoke('title', `${this.ip} / ${this.userid} / ${this.pcname}`)
      } else {
        this.ipcRenderer.invoke('title', `${this.ip} / ${this.userid} / ${this.username} / ${this.pcname}`)
      }
      this.register()
      // inject userinfo to electron mainWindow as well
      this.ipcRenderer.invoke('injectUserinfo', userinfo)
    },
    ipcRendererSetup () {
      const { ipcRenderer } = require('electron')
      this.ipcRenderer = ipcRenderer
      // remvoe main process all listeners
      this.ipcRenderer.removeAllListeners('quit')
      this.ipcRenderer.removeAllListeners('set-current-channel')
      // register main process quit event listener (To send leave channel message after user closed the app)
      this.ipcRenderer.on('quit', (event, args) => this.sendAppCloseActivity())
      // register main process set-current-channel event listener (To switch tab after notification showing up)
      this.ipcRenderer.on('set-current-channel', (event, channel) => {
        this.setCurrentChannel(channel)
      })
    },
    invokeIPCNotification (message, payload = { showMainWindow: false }) {
      this.ipcRenderer.invoke('notification', {
        message: message,
        ...payload
      })
    }
  },
  created() {
    if (!(this.currentChannel in this.messages) && !this.$isServer) {
      this.$store.commit("addChannel", this.currentChannel)
      this.log(this.time(), `add channel ${this.currentChannel} to $store! [messageMixin::created]`)
      this.$store.commit("resetUnread", this.currentChannel)
      this.log(this.time(), `add unread ${this.currentChannel} to $store! [messageMixin::created]`)
    }
    this.ipcRendererSetup()
    this.queryUserInfo()
  },
  mounted () {
    this.delayConnect = debounce(this.connect, 1500)
    this.delayLatestMessage = debounce(this.latestMessage, 400)
    this.delaySendChannelActivity = debounce(this.sendChannelActivity, 0.5 * 1000)

    // auto connect to ws server, delay 30s
    setTimeout(this.resetReconnectTimer, 30 * 1000)

    this.$nextTick(async () => {
      // restore last settings
      this.nickname = await this.$localForage.getItem('nickname') || this.userid
      // isEmpty(this.nickname) && (this.nickname = this.userid)
      this.department = await this.$localForage.getItem('department')
      this.adHost = await this.$localForage.getItem('adHost')
      this.wsHost = await this.$localForage.getItem('wsHost') || '220.1.34.75'
      this.wsPort = await this.$localForage.getItem('wsPort') || 8081
      this.adPassword = await this.$localForage.getItem('adPassword')
      // restore effect setting to store
      this.$store.commit('effect', await this.$localForage.getItem('effect'))
      // restore history count to store
      this.$store.commit('history', await this.$localForage.getItem('history') || 10)
      this.$store.commit('fetchingHistory', false)
      this.$store.commit('apiHost', this.wsHost)
      this.$store.commit('apiPort', parseInt(await this.$localForage.getItem('apiPort')) || 80)
      this.$store.commit('fePort', parseInt(await this.$localForage.getItem('fePort')) || 8080)
      this.$store.commit('resetUnread', this.userid)
      this.$store.commit('notifySettings', { ...this.notifySettings, ...await this.$localForage.getItem('notifySettings') })
      this.ipcRenderer.invoke('home-ready')
      // back from settings page
      if (this.backFromSettings) {
        this.back = true
        this.setCurrentChannel('chat')
        this.connect()
      }
      // restore usermap
      const mapping = await this.getCache('userMapping')
      if (mapping === false) {
        this.loadUserMapData()
      } else {
        this.$store.commit('userMap', mapping)
      }
      // checking api server for the user authority
      const authority = await this.getCache('userAuthority')
      if (authority === false) {
        this.loadAuthority()
      } else {
        this.$store.commit('authority', authority)
      }
    })
  },
  beforeDestroy () {
    // remove timer if user is going to leave the page
    this.clearReconnectTimer()
    this.closeWebsocket()
  }
}
</script>

<style lang="scss" scoped>
.color-primary {
  color: #007bff;
}
.logo {
  position: absolute;
  left: 80px;
  top: 75px;

  animation: fadeInDown;      /* referring directly to the animation's @keyframe declaration */
  animation-duration: 2000ms; /* don't forget to set a duration! */
}
.iconstack {
  animation: rubberBand;
  animation-duration: 2s;
}
.eye {
  cursor: pointer;
  position: absolute;
  right: .55rem;
  top: .55rem;
}
.float-preview {
  z-index: 1001;
  position:absolute;
  top: -80px;
  opacity: .85;
  border-radius: 15px;
  background-color: gray;
  width: 95%;
}
.float-emoji {
  z-index: 1002;
  position:absolute;
  top: calc(33vh - 66vh - 0px);
  opacity: .85;
  border-radius: 15px;
  background-color: lightgrey;
  width: 97.2vw;
  height: 33vh;
  overflow: auto;
}
@mixin notify() {
  position: absolute;
  top: 15px;
  opacity: 0.75;
}
.notify-announcement {
  @include notify();
  left: 80px;
}
.notify-dept {
  @include notify();
  left: 180px;
}
.notify-personal {
  @include notify();
  left: 265px;
}
.notify-chat {
  @include notify();
  left: 380px;
}
.nav-link:hover .badge {
  opacity: 1.0;
}
</style>
