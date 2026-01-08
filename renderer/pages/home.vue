<template lang="pug">
div: client-only
  //- =========================================================================
  //- 主要應用程式區塊 (已連線狀態)
  //- =========================================================================
  transition(v-if="connected", name="list", mode="out-in"): div
    b-card.m-1(no-body, header-tag="nav", v-cloak)
      //- 1. 頂部導航欄 (頻道切換)
      template(#header): b-nav(card-header, tabs, fill)
        //- 公告頻道
        b-nav-item(
          :active="isAnnouncement",
          title="全所公告訊息",
          @click="setCurrentChannel('announcement')"
        ): a.mr-1
          span.s-105 📣 公告
          b-badge.notify-announcement(
            variant="danger",
            pill,
            v-if="showUnread('announcement')"
          ) {{ getUnread('announcement') }}

        //- 通知頻道列表
        b-nav-item(
          :active="isChat",
          title="通知頻道列表",
          @click="setCurrentChannel('chat')"
        ): a.mr-1
          span.s-105 💬 通知
          b-badge.notify-chat(
            variant="secondary",
            pill,
            v-if="showChatUnread"
          ) {{ chatUnread }}

        //- 個人私訊頻道
        b-nav-item(
          :active="isPersonal",
          :title="`${userid} 個人通知訊息`",
          @click="setCurrentChannel(userid)"
        ): a.mr-1
          span.s-105 📧 私訊
          b-badge.notify-personal(
            variant="success",
            pill,
            v-if="showUnread(userid)"
          ) {{ getUnread(userid) }}

        //- 設定頁面連結
        b-nav-item(title="進入設定頁面"): nuxt-link(to="/settings")
          b-icon.mr-1(icon="list")

      //- 2. 聊天室控制列 (僅在聊天室模式顯示)
      transition(name="list", mode="out-in"): b-list-group.my-1(
        v-if="inChatting",
        flush
      ): b-list-group-item: b-link.d-flex.justify-content-between.align-items-center(
        @click="setCurrentChannel('chat')"
      )
        .mr-auto
          b-icon.mr-1(icon="arrow-left-circle-fill", font-scale="1.25", title="返回列表")
          span {{ getChannelName($store.getters.currentChannel) }}

        //- 線上使用者頭像組
        b-avatar-group.mr-4(
          v-if="connectedUsersCount > 1",
          size="2rem",
          :overlap="connectedUsersOverlapRatio"
        )
          user-avatar.shadow(
            v-for="(user, idx) in connectedUsers",
            v-if="idx < 9",
            :key="`connected_user_${user.userid}_${idx}`",
            :user-data="user"
          )
        span.mr-4(v-if="connectedUsersCount >= 9") +{{ connectedUsersCount - 9 }}
        user-avatar.mr-4.shadow(
          v-if="connectedUsersCount === 1",
          :user-data="connectedUsers[0]"
        )

      //- 3. 內容顯示區
      //- 聊天頻道列表 (Chat Board)
      transition(name="list", mode="out-in"): chat-board(v-if="showChatBoard")
      //- 訊息內容列表 (Message Board)
      transition(name="list", mode="out-in"): message-board(
        ref="msgBoard",
        v-if="showMessageBoard",
        :list="list",
        @reply="reply"
      )

    //- 4. 訊息輸入區
    transition(name="listY", mode="out-in"): b-input-group.p-1(
      v-if="showInputGroup",
      size="sm",
      style="position: relative",
      @keyup.esc.exact="emoji = false"
    )
      b-textarea(
        ref="textarea",
        v-model="inputText",
        placeholder="... Ctrl + V 可貼上剪貼簿的截圖 ...",
        @keyup.enter.ctrl="send",
        @keyup.enter.shift="send",
        @keyup.enter.alt="send",
        @keyup.esc="clear",
        @keydown="delayConnect",
        @paste="pasteImage($event, pasted)",
        no-resize,
        no-auto-shrink,
        autofocus
      )
      b-button.ml-1(
        @click="send",
        :variant="valid ? 'primary' : 'outline-primary'",
        :disabled="!valid",
        title="傳送"
      )
        b-icon(icon="cursor", rotate="45")
      b-button.mx-1(
        @click="emojiPickup",
        variant="outline-secondary",
        :title="`挑選表情 ${emojiCode} => ${emojiTxt}`"
      ) #[span.h5 {{ emojiTxt }}]
      b-button(@click="pick", variant="outline-success", title="傳送圖片")
        b-icon(icon="image")

      //- 輸入預覽
      lah-transition: .d-flex.justify-content-between.p-2.float-preview.preview(
        v-if="!empty(inputText) || !empty(this.inputImages)",
        ref="floatPreview"
      )
        span.text-white.font-weight-bold 預覽
        message.my-message(
          :raw="messagePreviewJson",
          :preview="true",
          style="opacity: 1 !important; z-index: 1001;"
        )
      //- 表情符號選擇器
      lah-transition(fade): .float-emoji(v-if="emoji")
        emoji-pickup(@click="addEmoji")

  //- =========================================================================
  //- 登入/驗證介面 (未連線狀態)
  //- =========================================================================
  .center.vh-100(v-else, v-cloak)
    .w-75.mt-n5
      .center.mb-5.logo
        b-img(src="tyland.jpg", fluid, style="max-width: 96px")
        H1 {{ $config.appName }}
      .center: b-iconstack#main_logo_icon.iconstack(font-scale="6", v-cloak)
        b-icon(icon="chat-dots", variant="success", flip-h, shift-h="10", shift-v="3", stacked)
        b-icon(icon="chat-text", variant="info", shift-h="-10", shift-v="6", stacked)

      //- 管理員手動登入選項
      .d-flex.justify-content-end: b-checkbox(
        v-if="authority.isAdmin",
        v-model="manualLogin",
        size="sm",
        switch
      ) 手動登入
      
      admin-manual-login(
        v-if="manualLogin",
        :def-id="adAccount",
        :def-name="adName",
        :def-dept="department",
        @connect="handleAdminConnect"
      )
      
      //- 一般使用者連線設定
      div(v-else)
        b-input-group.my-3(prepend="伺服器")
          b-input(
            v-model="wsHost",
            :state="validHost",
            placeholder="... 即時通伺服器IP ...",
            v-b-tooltip="'伺服器IP'",
            trim
          )
          span.my-auto.mx-1 :
          b-input(
            v-model="wsPort",
            type="number",
            :state="validPort",
            style="max-width: 100px",
            v-b-tooltip="'通訊埠號'"
          )
        .d-flex-column.align-items-center: b-input-group.center(v-if="validHost && validPort")
          b-button(
            :variant="queryADVariant",
            :disabled="connecting || !validInformation",
            @click="connect",
            title="連線",
            pill
          )
            b-icon(icon="box-arrow-right" font-scale="1.25")
            span.mx-1 {{ adName }}
            b-badge(variant="light") {{ adAccount }} / {{ deptName }}
          
          //- 錯誤提示與狀態提示
          h6.text-warning.mt-1(v-if="!validHost || !validPort") ⚠ 請完整填寫伺服器連線資訊
          h6.text-danger.mt-1(v-if="!validAdAccount || !validAdName") ⚠ 等待使用者AD資料更新中 ... 

  //- 右下角狀態列
  status(:status-text="connectText")
</template>

<script>
/**
 * @file home.vue
 * @description 桃園即時通應用程式主入口組件。
 */
import trim from "lodash/trim";
import ImageUpload from "~/components/image-upload.vue";

export default {
  transition: "list",
  head: {
    title: `${process.env.APP}`
  },
  components: {
    ImageUpload
  },

  // ==========================================================================
  // Data: 組件狀態定義
  // ==========================================================================
  data: () => ({
    // --- UI 互動狀態 ---
    emoji: false,
    image: null,
    inputText: "",
    inputImages: [],

    // --- 狀態訊息佇列 (解決閃爍問題) ---
    connectText: "",
    msgQueue: [],
    processingQueue: false,

    // --- 鍵盤監聽與快捷鍵 ---
    back: false,
    keyCodes: [],

    // --- 使用者與部門資訊 ---
    adHost: "",
    adAccount: "",
    adName: "",
    adPassword: "",
    adPasswordIcon: "eye-slash",
    adPasswordType: "password",
    department: "",
    departmentOpts: [
      { value: "", text: "選擇部門" },
      { value: "reg", text: "登記課" },
      { value: "inf", text: "資訊課" },
      { value: "adm", text: "行政課" },
      { value: "sur", text: "測量課" },
      { value: "val", text: "地價課" },
      { value: "hr", text: "人事室" },
      { value: "acc", text: "會計室" },
      { value: "supervisor", text: "主任秘書室" },
    ],

    // --- 連線設定與狀態 ---
    manualLogin: false,
    asking: false,
    wsHost: "",
    wsPort: 8081,
    connecting: false,
    reconnectMs: 20 * 1000,
    syncDepartmentTimer: null,
    checkUnreadTimer: null,
    checkUreadDuration: 3 * 60 * 60 * 1000
  }),

  // ==========================================================================
  // Fetch: 初始化資料恢復
  // ==========================================================================
  async fetch() {
    this.$localForage.getItem(this.imageMementoCacheKey).then((arr) => {
      this.$store.commit("imageMemento", arr || []);
    });
    this.$localForage.getItem(this.messageMementoCacheKey).then((arr) => {
      this.$store.commit("messageMemento", arr || []);
    });
  },

  // ==========================================================================
  // Computed: 計算屬性
  // ==========================================================================
  computed: {
    // --- 頻道狀態判斷 ---
    isChat() {
      return !this.currentChannel.startsWith("announcement") && !this.isPersonal;
    },
    isPersonal() {
      return this.adAccount === this.currentChannel;
    },
    isAnnouncement() {
      return this.currentChannel === "announcement";
    },
    isInf() {
      return this.currentChannel === "inf";
    },
    isAdm() {
      return this.currentChannel === "adm";
    },
    isVal() {
      return this.currentChannel === "val";
    },
    isReg() {
      return this.currentChannel === "reg";
    },
    isSur() {
      return this.currentChannel === "sur";
    },
    isAcc() {
      return this.currentChannel === "acc";
    },
    isHr() {
      return this.currentChannel === "hr";
    },
    isSupervisor() {
      return this.currentChannel === "supervisor";
    },
    isLds() {
      return this.currentChannel === "lds";
    },

    // --- UI 顯示邏輯 ---
    connectedUsersOverlapRatio() {
      return this.connectedUsers.length < 10 ? 0.0 : 0.4;
    },
    showInputGroup() {
      return (
        !this.currentChannel.startsWith("announcement") &&
        this.currentChannel !== this.adAccount &&
        this.currentChannel !== "chat"
      );
    },
    showMessageBoard() {
      return this.currentChannel !== "chat";
    },
    showChatBoard() {
      return this.isChat;
    },
    inChatting() {
      return !this.stickyChannels.includes(this.currentChannel);
    },

    // --- 訊息與頻道資料 ---
    list() {
      return this.messages[this.currentChannel] || [];
    },
    stickyChannels() {
      return ["announcement", this.adAccount, "chat"];
    },
    showUnreadChannels() {
      return ["announcement", this.adAccount, `announcement_${this.department}`];
    },
    chatUnread() {
      const result = Object.entries(this.unread).reduce((acc, curr) => {
        const isTarget =
          parseInt(curr[0]) > 0 ||
          ["lds", "adm", "sur", "inf", "reg", "val", "acc", "hr", "supervisor"].includes(curr[0]);
        return isTarget ? acc + curr[1] : acc;
      }, 0);
      return result > 99 ? "99+" : result;
    },
    showChatUnread() {
      return this.chatUnread > 0 || this.chatUnread === "99+";
    },
    deptName() {
      return this.getDepartmentName(this.department);
    },

    // --- API 與連線設定 ---
    wsConnStr() {
      return `ws://${this.wsHost}:${this.wsPort}`;
    },
    userQueryStr() {
      return `${this.apiQueryUrl}${this.$consts.API.JSON.USER}`;
    },

    // --- 驗證 (Validation) ---
    valid() {
      return !this.empty(trim(this.inputText)) || !this.empty(this.inputImages);
    },
    validAdHost() {
      return this.$utils.isIPv4(this.adHost) === false ? false : null;
    },
    validAdAccount() {
      return !this.empty(this.adAccount);
    },
    validAdName() {
      return !this.empty(this.adName);
    },
    validAdPassword() {
      return this.empty(this.adPassword) ? false : null;
    },
    validHost() {
      return this.$utils.isIPv4(this.wsHost);
    },
    validPort() {
      const i = parseInt(trim(this.wsPort));
      return i > 1024 && i < 65535;
    },
    validDepartment() {
      return !this.$utils.empty(trim(this.department));
    },
    validInformation() {
      return (
        this.validAdAccount &&
        this.validAdName &&
        this.validDepartment &&
        this.validPort &&
        this.validHost
      );
    },
    disabledAdLoginBtn() {
      return (
        this.empty(this.adPassword) ||
        this.validAdHost === false ||
        this.validAdAccount === false
      );
    },
    queryADVariant() {
      if (this.empty(this.adAccount)) return "primary";
      if (this.empty(this.adName)) return "warning";
      return "success";
    },

    // --- 通知設定 ---
    notifyChannels() {
      const channels = ["announcement", `announcement_${this.department}`];
      this.notifySettings.personal && channels.push(this.adAccount);
      this.notifySettings.chat && channels.push("lds");
      this.notifySettings.chat && channels.push(this.department);
      return channels;
    },

    // --- Markdown 訊息處理 ---
    markdImages() {
      let imgMdText = this.inputImages
        .map((base64, idx) => `![preview-${idx}](${base64})`)
        .join("\n");
      if (!this.empty(this.inputText) && !this.empty(imgMdText)) {
        imgMdText = `\n\n***\n\n${imgMdText}`;
      }
      return imgMdText;
    },
    markdMessage() {
      if (this.empty(this.inputText) && this.empty(this.inputImages)) return "";
      return this.$utils.convertMarkd(`${this.inputText} ${this.markdImages}`);
    },
    messagePreviewJson() {
      return {
        id: 0,
        channel: this.to,
        date: this.date(),
        time: this.time(),
        message: this.markdMessage,
        prepend: false,
        sender: this.adAccount,
        type: "mine"
      };
    }
  },

  // ==========================================================================
  // Watch: 偵聽器
  // ==========================================================================
  watch: {
    connectText(val) {
      this.$store.commit("statusText", val);
    },

    totalUnread(val) {
      this.ipcRenderer.invoke("toggleUnreadTrayIcon", { unread: val });
    },

    adAccount(val) {
      this.$localForage.setItem("adAccount", val);
      this.$store.commit("userid", val);
      this.$nextTick(() => {
        if (this.validAdAccount) this.loadApiADUserData();
      });
    },

    currentChannel(nVal, oVal) {
      this.sendChannelUpdate(nVal);
      if (!(nVal in this.messages)) {
        this.$store.commit("addChannel", nVal || this.adAccount);
        this.$store.commit("resetUnread", nVal || this.adAccount);
      }
      this.messages[oVal] && (this.messages[oVal].length = 0);
      this.latestMessage();
      if (!this.showUnreadChannels.includes(nVal)) this.queryOnlineClients();
      this.clear();
      this.scrollToBottom();
    },

    wsHost(val) {
      this.resetReconnectTimer();
      if (this.$utils.isIPv4(val) || this.$utils.empty(val)) {
        this.$localForage.setItem("wsHost", val);
        this.$store.commit("apiHost", val);
      }
    },

    wsPort(val) {
      this.resetReconnectTimer();
      this.validPort && this.$localForage.setItem("wsPort", val);
    },

    department(val) {
      this.resetReconnectTimer();
      this.$store.commit("userdept", val);
      this.$localForage.setItem("department", val);
      // 部門變動即刻更新視窗標題
      this.updateWindowTitle();
    },

    manualLogin(flag) {
      flag ? this.clearReconnectTimer() : this.resetReconnectTimer();
    },

    userid(val) {
      !this.empty(val) && val !== this.adAccount && (this.adAccount = val);
    },

    adHost(val) {
      this.$store.commit("ad", val);
      this.$localForage.setItem("adHost", val);
    },

    adName(val) {
      this.$localForage.setItem("adName", val);
      this.$store.commit("username", val);
      // 姓名變動即刻更新視窗標題
      this.updateWindowTitle();
    },

    adPassword(val) {
      this.$store.commit("password", val);
      this.$localForage.setItem("adPassword", val);
    },

    inputImages() {
      this.adjustPreviewPosition();
    },

    inputText() {
      this.$nextTick(() => this.adjustPreviewPosition());
    },

    keyCodes() {
      this.handleKonamiCode();
    },

    apiUserinfo(val) {
      this.handleApiUserInfoUpdate(val);
    }
  },

  // ==========================================================================
  // Methods: 方法定義
  // ==========================================================================
  methods: {
    // ------------------------------------------------------------------------
    // [UI Interaction] 狀態文字佇列處理
    // ------------------------------------------------------------------------
    /**
     * 設定狀態列文字 (使用 Queue 機制)
     */
    setConnectText(text) {
      this.msgQueue.push(text);
      if (this.msgQueue.length > 10) this.msgQueue.shift();
      this.processQueue();
    },

    processQueue() {
      if (this.processingQueue || this.msgQueue.length === 0) return;
      this.processingQueue = true;
      const text = this.msgQueue.shift();
      this.connectText = text;
      setTimeout(() => {
        this.processingQueue = false;
        this.processQueue();
      }, 1000);
    },

    // ------------------------------------------------------------------------
    // [UI Helpers] 視窗與介面控制
    // ------------------------------------------------------------------------
    /**
     * 統一更新視窗標題的方法
     */
    updateWindowTitle() {
      const parts = [];
      // 1. IP (優先使用主進程回傳的優先 IP)
      const ip = this.userinfo?.ip || this.ip || "";
      if (!this.empty(ip) && String(ip) !== "undefined") parts.push(ip);
      // 2. 姓名
      const name = this.adName || this.adAccount || this.userid || "";
      if (!this.empty(name) && String(name) !== "undefined") parts.push(name);
      // 3. 部門
      const dept = this.deptName;
      if (
        !this.empty(dept) &&
        dept !== "未知課室" &&
        String(dept) !== "undefined"
      )
        parts.push(dept);

      const titleStr = parts.join(" / ");
      if (titleStr && !titleStr.includes("undefined")) {
        this.ipcRenderer.invoke("title", titleStr);
      }
    },

    scrollToBottom() {
      this.$nextTick(() => {
        const el = this.$refs.msgBoard?.$el;
        if (!el) return;
        let start = null;
        const step = (timestamp) => {
          if (!start) start = timestamp;
          if (el) el.scrollTop = el.scrollHeight;
          if (timestamp - start < 300) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
      });
    },

    adjustPreviewPosition() {
      if (this.$refs.floatPreview)
        this.$refs.floatPreview.style.top =
          "-" + this.$refs.floatPreview.offsetHeight + "px";
    },

    clear() {
      this.inputText = "";
      this.inputImages = [];
    },

    // ------------------------------------------------------------------------
    // [Input Handlers] 輸入與媒體處理
    // ------------------------------------------------------------------------
    pasted(base64) {
      !this.inputImages.includes(base64) && this.inputImages.push(base64);
    },

    removeInoutImage(base64data) {
      const index = this.inputImages.indexOf(base64data);
      if (index > -1) this.inputImages.splice(index, 1);
    },

    emojiPickup() {
      this.emoji = !this.emoji;
    },

    addEmoji(emoji) {
      this.emoji = false;
      const element = this.$refs.textarea;
      if (element && element.selectionStart) {
        const appended =
          this.inputText.substring(0, element.selectionStart).trim() +
          " " +
          emoji +
          " ";
        this.inputText =
          appended +
          this.inputText
            .substring(element.selectionEnd, this.inputText.length)
            .trim();
        element.focus();
        this.$nextTick(() => {
          element.selectionEnd = appended.length;
        });
      } else {
        this.inputText = this.inputText + " " + emoji;
        element.focus();
      }
    },

    pick() {
      this.modal(
        this.$createElement(ImageUpload, {
          props: { to: this.currentChannel, modalId: "image-upload-modal" },
          on: {
            publish: (b64) =>
              this.sendImage(b64, "上傳圖片", this.currentChannel)
          }
        }),
        { id: "image-upload-modal", size: "xl", title: `直接傳送圖片` }
      );
    },

    reply(raw) {
      const sender = this.userMap[raw["sender"]] || raw["sender"];
      const hrIdx = raw["message"]?.indexOf("<hr>");
      const text =
        hrIdx === -1 ? raw["message"] : raw["message"].substring(hrIdx + 4);
      const tmp = document.createElement("DIV");
      tmp.innerHTML = `@${sender} ${text}`;
      let innerText = tmp.textContent || tmp.innerText || "";
      if (this.$utils.length(innerText) > 20)
        innerText = innerText.substring(0, 20) + " ... ";
      this.inputText = `${innerText}\n\n***\n\n`;
      this.$nextTick(() => {
        this.$refs.textarea.$el.scrollTop = 999999;
        this.$refs.textarea?.focus();
      });
    },

    switchAdPasswordIcon() {
      this.adPasswordIcon = this.adPasswordIcon === "eye" ? "eye-slash" : "eye";
      this.adPasswordType =
        this.adPasswordType === "password" ? "text" : "password";
    },

    // ------------------------------------------------------------------------
    // [Auth & Data Loading] 驗證與資料載入
    // ------------------------------------------------------------------------
    invokeADQuery() {
      if (this.asking === true) return;
      this.adName = this.userMap[this.adAccount] || this.adAccount;
      this.asking = true;
      this.ipcRenderer
        .invoke("ad-user-query", {
          url: `ldap://${this.adHost}`,
          baseDN: `DC=${this.domain.split(".").join(",DC=")}`,
          username: `${this.adAccount}@${this.domain}`,
          password: this.adPassword
        })
        .then((result) => {
          this.$store.commit("userid", this.adAccount);
          this.$store.commit("username", result.description);
          this.adName = result.description;
          this.department = result.group;
          this.connect();
        })
        .catch((err) => {
          this.alert(`查詢失敗，密碼錯誤!?`, { title: `ldap://${this.adHost}` });
        })
        .finally(() => {
          this.asking = false;
        });
    },

    loadApiUserData() {
      if (this.validHost) {
        this.$axios
          .post(this.userQueryStr, { type: "authentication", ip: this.ip })
          .then(({ data }) => {
            if (this.$utils.statusCheck(data.status)) {
              this.setCache(
                "userAuthority",
                data.authority,
                this.userDataCacheDuration
              );
              this.setCache(
                "apiUserinfo",
                data.info,
                this.userDataCacheDuration
              );
              this.$store.commit("authority", data.authority);
              this.$store.commit("apiUserinfo", data.info);
            }
          })
          .catch((err) => this.alert(err.toString()));
      } else {
        this.timeout(this.loadApiUserData, 400);
      }
    },

    loadApiADUserData() {
      if (this.validHost && this.validAdAccount) {
        this.$axios
          .post(this.userQueryStr, { type: "ad_user_info", id: this.adAccount })
          .then(({ data }) => {
            if (this.$utils.statusCheck(data.status)) {
              const raw = data.data || {};
              if (!this.empty(raw.name)) {
                this.adName = raw.name;
                this.$store.commit("username", raw.name);
                this.$localForage.setItem("adName", raw.name);
              }
              const deptArr = raw.department;
              if (Array.isArray(deptArr) && deptArr.length > 0) {
                const deptName = deptArr[0];
                if (deptArr.length === 1 || this.empty(this.department)) {
                  const prev = this.deptName;
                  this.handleApiUserInfoUpdate({ unit: deptName });
                  this.$store.commit("apiUserinfo", { unit: deptName });
                  if (prev !== deptName)
                    this.ipcRenderer.invoke("change-user-dept", {
                      api: `${this.apiQueryUrl}${this.$consts.API.JSON.USER}`,
                      type: "upd_dept",
                      id: this.userid,
                      dept: deptName
                    });
                }
              }
            }
          })
          .catch((err) => this.alert(err.toString()));
      } else {
        this.timeout(this.loadApiADUserData, 400);
      }
    },

    loadUserMapData() {
      if (this.validHost) {
        this.$axios
          .post(this.userQueryStr, { type: "user_mapping" })
          .then(({ data }) => {
            if (this.$utils.statusCheck(data.status)) {
              this.$store.commit("userMap", data.data);
              this.setCache("userMap", data.data, this.userDataCacheDuration);
            }
          })
          .catch((err) => this.alert(err.toString()));
      } else {
        this.timeout(this.loadUserMapData, 400);
      }
    },

    // ------------------------------------------------------------------------
    // [Connection & WS] WebSocket 通訊
    // ------------------------------------------------------------------------
    /**
     * [FIXED] 還原正確的連線清理邏輯，解決 state 衝突問題
     */
    connect() {
      if (this.connected && this.websocket?.readyState === 1) {
        this.resetReconnectTimer();
      } else if (this.validInformation) {
        this.connecting = true;
        try {
          // [還原] 如果已有連線實例，先關閉它以釋放資源
          if (this.websocket) {
            this.websocket.onopen = null;
            this.websocket.onmessage = null;
            this.websocket.onerror = null;
            this.websocket.onclose = null;
            this.websocket.close();
          }

          this.setConnectText("連線中");
          const ws = new WebSocket(this.wsConnStr);
          
          ws.onopen = () => {
            this.$store.commit("websocket", ws);
            this.log(this.time(), "已連線");
            this.register();
            this.list.length = 0;
            this.delayLatestMessage();
            this.setConnectText("已上線");
            this.connecting = false;
          };
          
          ws.onclose = () => {
            this.$store.commit("websocket", undefined);
            this.setConnectText("連線已斷開");
            this.connecting = false;
          };

          ws.onerror = (e) => {
            this.$store.commit("websocket", undefined);
            this.setConnectText("WS伺服器連線出錯");
            this.connecting = false;
          };

          ws.onmessage = async (e) => this.handleWebSocketMessage(e);
        } catch (e) {
          this.setConnectText("連線初始化失敗");
          this.closeWebsocket();
        }
      }
    },

    async handleWebSocketMessage(e) {
      const incoming = JSON.parse(e.data);
      const channel = incoming.channel;
      const receivedId = incoming.message?.id || incoming.id;
      const lastReadId = (await this.getChannelLastReadId(channel)) || 0;
      
      if (incoming.type === "ack") {
        this.handleAckMessage(incoming.message);
      } else if (channel === "system") {
        this.handleSystemMessage(incoming.message);
      } else if (this.currentChannel === channel) {
        if (!Array.isArray(this.messages[channel]))
          this.$store.commit("addChannel", channel);
        this.$nextTick(() => {
          if (
            !this.$utils.empty(incoming.message) &&
            !this.messages[channel].find((m) => m.id === incoming.id)
          ) {
            this.messages[channel].push(incoming);
            if (receivedId > lastReadId)
              this.setChannelUnread(channel, receivedId);
            this.triggerNotification(incoming);
            this.delayLatestMessage();
            this.scrollToBottom();
          }
        });
      } else if (incoming.message && incoming.sender !== "system") {
        if (
          receivedId > lastReadId &&
          [
            "lds",
            "announcement",
            `announcement_${this.userdept}`,
            this.userid,
            this.userdept
          ].includes(channel)
        )
          this.plusUnread(channel);
        this.triggerNotification(incoming);
      }
      this.connecting = false;
    },

    /**
     * 處理系統確認訊息 (ACK)
     */
    async handleAckMessage(json) {
      const cmd = json?.command;
      this.log(this.time(), `處理系統 ACK: ${cmd}`, json);
      
      switch (cmd) {
        case "register":
          json.success && this.queryUnreadCount();
          break;
        case "mychannel":
          if (json.success) {
            if (json.payload.action === "add") this.addChatChannel(json.payload);
            else if (json.payload.action === "remove") this.removeChatChannel(json.payload);
          }
          break;
        case "remove_channel":
          json.success && this.$store.commit("removeParticipatedChannel", json.payload);
          this.notify(`${json.message}`, { type: json.success ? "success" : "warning" });
          break;
        case "remove_message":
          if (json.success) {
            const idx = this.messages[json.payload.channel]?.findIndex(msg => msg.id === json.payload.id);
            if (idx > -1) this.messages[json.payload.channel].splice(idx, 1);
            const cascade = json.payload.cascade;
            if (cascade?.to && cascade?.id) {
              this.websocket.send(JSON.stringify({
                type: "command", sender: this.adAccount, date: this.date(), time: this.time(), channel: 'system',
                message: JSON.stringify({ command: 'remove_message', channel: cascade.to, id: cascade.id, cascade: '' })
              }));
            }
          }
          this.setConnectText(`${json.message}`);
          break;
        case "edit_message":
          if (json.success) {
            const channel = json.payload.channel;
            const payload = json.payload.payload;
            const found = this.messages[channel]?.find(msg => msg.id === payload.id);
            if (found) {
              found.message = payload.message;
              const cascade = json.payload.cascade;
              if (cascade?.id && cascade?.to) {
                this.websocket?.send(JSON.stringify({
                  type: "command", sender: this.userid, date: this.date(), time: this.time(), channel: 'system',
                  message: {
                    command: 'edit_message', channel: cascade.to, id: cascade.id, sender: this.userid,
                    payload: { ...payload, id: cascade.id, channel: cascade.to, sender: this.userid, title: 'dontcare', message: payload.message.replaceAll(this.regexpReplyHeader, '') }
                  }
                }));
              }
            }
          }
          break;
        case "previous":
          this.$store.commit("fetchingHistory", false);
          this.setConnectText(`${json.message}(${json.payload.count}筆)`);
          break;
        case "unread":
          this.$store.commit("setUnread", {
            channel: json.payload.channel,
            count: json.payload.unread
          });
          break;
        case "online":
          this.$store.commit(
            "connectedUsers",
            json.payload.users.filter((n) => n)
          );
          break;
        case "private_message":
          const insertedId = json.payload.insertedId;
          const insertedChannel = json.payload.channel;
          if (insertedChannel !== this.adAccount && !insertedChannel?.startsWith("announcement") && !this.chatRooms.includes(insertedChannel)) {
            const remove = JSON.stringify({ to: insertedChannel, id: insertedId });
            this.websocket.send(this.packMessage(json.payload.message, {
              channel: this.adAccount, title: remove, priority: 4, flag: 1,
            }));
          }
          this.setConnectText(`${json.message}`);
          break;
        case "set_read":
        case "check_read":
          const targetList = cmd === 'set_read' ? this.messages[json.payload.channel] : this.messages[json.payload.sender];
          if (Array.isArray(targetList)) {
            const msgId = cmd === 'set_read' ? json.payload.id : json.payload.senderChannelMessageId;
            const found = targetList.find(m => m?.id === msgId);
            if (found && (found.flag & 2) !== 2) found.flag += 2;
          }
          break;
        case "update_current_channel":
          this.setConnectText(json.message);
          break;
        default:
          console.warn(`收到未支援指令 ${cmd} ACK`, json);
      }
    },

    async handleSystemMessage(json) {
      if (json.command === "update_user" && json.payload.id) {
        await this.$localForage.setItem("adAccount", json.payload.id);
        await this.$localForage.setItem("adName", json.payload.name);
        await this.$localForage.setItem("department", json.payload.dept);
        this.ipcRenderer.invoke("reload");
      }
    },

    // ------------------------------------------------------------------------
    // [Messaging] 訊息發送與註冊
    // ------------------------------------------------------------------------
    send() {
      if (this.sendTo(this.markdMessage, { channel: this.currentChannel }))
        this.clear();
      this.$refs.textarea?.focus();
    },

    /**
     * [FIXED] 加入強大的狀態檢查機制，解決 CLOSING/CLOSED 狀態下的發送錯誤
     */
    sendTo(msg, opts = {}) {
      if (this.$utils.empty(msg)) return false;

      // [核心修正] 檢查連線狀態是否為 1 (OPEN)
      if (!this.websocket || this.websocket.readyState !== 1) {
        this.setConnectText("連線不穩定，正在自動修復...");
        this.connect(); // 嘗試背景重連
        return false;
      }

      try {
        this.websocket.send(
          this.packMessage(msg, { channel: this.currentChannel, ...opts })
        );
        return true;
      } catch (e) {
        this.err("WS 發送失敗", e);
        return false;
      }
    },

    register() {
      if (this.websocket?.readyState === 1 && this.validAdAccount && this.validAdName) {
        this.websocket.send(
          this.packCommand({
            command: "register",
            ip: this.ip,
            domain: this.domain,
            userid: this.adAccount,
            username: this.adName,
            dept: this.department,
            timestamp: +new Date(),
            channel: this.currentChannel
          })
        );
        this.reportToAPIServer();
        this.checkUnread();
      }
    },

    latestMessage() {
      if (this.websocket?.readyState === 1)
        this.websocket.send(
          JSON.stringify({
            type: "command",
            sender: this.adAccount,
            date: this.date(),
            time: this.time(),
            channel: "system",
            message: JSON.stringify({
              command: "latest",
              channel: this.currentChannel,
              count: 15
            })
          })
        );
    },

    // ------------------------------------------------------------------------
    // [Electron] IPC 與系統通知
    // ------------------------------------------------------------------------
    ipcRendererSetup() {
      const { ipcRenderer } = require("electron");
      this.ipcRenderer = ipcRenderer;
      this.ipcRenderer.on("set-current-channel", (e, channel) =>
        this.setCurrentChannel(channel)
      );
      this.ipcRenderer.on("in-browser-notify", (e, p) =>
        p.statusOnly
          ? this.setConnectText(p.message)
          : this.notify(p.message, {
              type: p.type || "info",
              title: p.title || "📢 通知"
            })
      );
    },

    async triggerNotification(incoming) {
      if (
        (incoming.message?.id || incoming.id) >
        (await this.getChannelLastReadId(incoming.channel))
      ) {
        this.ipcRenderer.invoke("unread", incoming.channel);
        this.invokeNotification(incoming);
      }
    },

    async invokeNotification(i) {
      const temp = document.createElement("div");
      temp.innerHTML = i.message.title || i.message;
      const title = temp.innerText.substring(0, 18) + "...";
      this.setCache(`${i.channel}_last_id`, i.message.id || i.id);
      if (i.sender !== this.adAccount && this.notifyChannels.includes(i.channel))
        this.ipcRenderer.invoke("notification", {
          message: title,
          showMainWindow: true
        });
    },

    // ------------------------------------------------------------------------
    // [Timers & Lifecycle] 計時器與生命週期輔助
    // ------------------------------------------------------------------------
    resetReconnectTimer() {
      this.clearReconnectTimer();
      if (this.timer === null && this.$route.name === "home")
        this.$store.commit(
          "timer",
          setInterval(() => this.connect(), this.reconnectMs)
        );
    },

    keydown(e) {
      if (e.keyCode >= 37 && e.keyCode <= 40)
        this.setConnectText(["←", "↑", "→", "↓"][e.keyCode - 37]);
      else if (e.keyCode === 65 || e.keyCode === 66)
        this.setConnectText(e.keyCode === 65 ? "a" : "b");
      else this.keyCodes.length = 0;
      this.keyCodes.push(e.keyCode);
      if (this.keyCodes.length > 10) this.keyCodes.shift();
    },

    handleKonamiCode() {
      if (
        this.$utils.md5(this.keyCodes.join(",")) ===
        "f20b4566a1f6b848f1fbec48b2ab2c10"
      ) {
        this.$store.commit("authority", { isAdmin: !this.authority.isAdmin });
        this.keyCodes.length = 0;
      }
    },

    visibilityChange() {
      this.$store.commit("windowVisible", !document.hidden);
    },

    watchModal(e, id) {
      if (e.type === "shown") {
        this.$store.commit("lastModalId", id);
        this.clearReconnectTimer();
      } else this.resetReconnectTimer();
    },

    addCurrentChannel() {
      if (!(this.currentChannel in this.messages) && !this.$isServer) {
        this.$store.commit("addChannel", this.currentChannel);
        this.$store.commit("resetUnread", this.currentChannel);
      }
    },

    async getChannelLastReadId(c) {
      return (await this.getCache(`${c}_last_id`)) || 0;
    },

    setChannelUnread(c, id) {
      this.setCache(`${c}_last_id`, id);
    },

    queryUnreadCount() {
      [
        "announcement",
        `announcement_${this.userdept}`,
        this.adAccount,
        "lds",
        this.userdept
      ].forEach((c) => this.queryChannelUnreadCount(c));
    },

    async queryChannelUnreadCount(c) {
      if (this.websocket?.readyState === 1)
        this.websocket.send(
          JSON.stringify({
            type: "command",
            sender: this.adAccount,
            date: this.date(),
            time: this.time(),
            channel: "system",
            message: JSON.stringify({
              command: "unread",
              channel: c,
              last: await this.getChannelLastReadId(c)
            })
          })
        );
    },

    async checkDefaultSvrIp() {
      this.wsHost =
        (await this.$localForage.getItem("wsHost")) ||
        this.defaultSvrIp ||
        (await this.timeout(this.checkDefaultSvrIp, 400));
    },

    reportToAPIServer() {
      this.ipcRenderer.invoke("add-ip-entry", {
        api: `${this.apiQueryUrl}${this.$consts.API.JSON.IP}`,
        type: "add_user_ip_entry",
        note: `${this.domain} ${this.department}`,
        entry_id: this.adAccount,
        entry_desc: this.adName
      });
    },

    refreshApiDepartment(v) {
      if (!this.$utils.empty(v)) {
        const n = this.getDepartmentName(v);
        this.$store.commit("apiUserinfo", { unit: n });
        this.ipcRenderer.invoke("change-user-dept", {
          api: `${this.apiQueryUrl}${this.$consts.API.JSON.USER}`,
          type: "upd_dept",
          id: this.userid,
          dept: n
        });
      }
    },

    handleApiUserInfoUpdate(v) {
      this.department =
        {
          "資訊課": "inf",
          "行政課": "adm",
          "登記課": "reg",
          "測量課": "sur",
          "地價課": "val",
          "人事室": "hr",
          "會計室": "acc"
        }[v?.unit] || "supervisor";
    },

    getDepartmentName(v) {
      return (
        {
          "inf": "資訊課",
          "adm": "行政課",
          "reg": "登記課",
          "sur": "測量課",
          "val": "地價課",
          "hr": "人事室",
          "acc": "會計室",
          "supervisor": "主任祕書室"
        }[v] || "未知課室"
      );
    },

    checkUnread() {
      if (this.totalUnread > 0)
        this.ipcRenderer.invoke("notification", {
          message: `您有 ${this.totalUnread} 個未讀訊息!`,
          showMainWindow: false
        });
      this.timeout(this.checkUnread, this.checkUreadDuration).then(
        (h) => (this.checkUnreadTimer = h)
      );
    },

    handleAdminConnect(info) {
      this.wsHost = info.host;
      this.wsPort = info.port;
      this.adAccount = info.id;
      this.adName = info.name;
      this.department = info.dept;
      this.manualLogin = false;
      this.connect();
    },

    sendChannelUpdate(channel) {
      if (this.websocket?.readyState === 1)
        this.websocket.send(
          this.packCommand({
            command: "update_current_channel",
            channel: channel,
            userid: this.adAccount
          })
        );
    },

    queryUserInfo() {
      this.$localForage.getItem("userinfo").then((u) => {
        if (u) this.setUserInfo(u);
        else this.ipcRenderer.invoke("userinfo").then((u) => this.setUserInfo(u));
      });
    },

    async setUserInfo(u) {
      if (this.empty(u?.userid)) u.userid = this.adAccount;
      this.$store.commit("userinfo", u);
      this.$localForage.setItem("userinfo", u);
      if (!this.$utils.isIPv4(this.adHost)) this.adHost = this.getFirstDNSIp();
      // 更新視窗標題
      this.updateWindowTitle();
      this.register();
      this.ipcRenderer.invoke("injectUserinfo", { ...u, userdept: this.userdept });
    },

    async restoreSettings() {
      this.adAccount = await this.$localForage.getItem("adAccount");
      this.adName = await this.$localForage.getItem("adName");
      this.adPassword = await this.$localForage.getItem("adPassword");
      this.department = await this.$localForage.getItem("department");
      this.adHost = await this.$localForage.getItem("adHost");
      this.wsHost = await this.$localForage.getItem("wsHost");
      this.wsPort = (await this.$localForage.getItem("wsPort")) || 8081;
    },

    addChatChannel(payload) {
      this.$store.commit("addParticipatedChannel", { id: payload.id, name: payload.name, participants: payload.participants, type: payload.type });
    },

    removeChatChannel(payload) {
      this.$store.commit("removeParticipatedChannel", { id: payload.id, name: payload.name, participants: payload.participants, type: payload.type });
    }
  },

  // ==========================================================================
  // Lifecycle: 生命週期鉤子
  // ==========================================================================
  created() {
    this.addCurrentChannel();
    this.ipcRendererSetup();
    this.queryUserInfo();
  },

  mounted() {
    this.delayConnect = this.$utils.debounce(this.connect, 1500);
    this.delayLatestMessage = this.$utils.debounce(this.latestMessage, 400);
    this.resetReconnectTimer();

    this.$nextTick(async () => {
      await this.restoreSettings();
      const mapping = await this.getCache("userMapping");
      mapping ? this.$store.commit("userMap", mapping) : this.loadUserMapData();
      const auth = await this.getCache("userAuthority");
      const info = await this.getCache("apiUserinfo");
      if (auth && info) {
        this.$store.commit("authority", auth);
        this.$store.commit("apiUserinfo", info);
      } else this.loadApiUserData();
      this.checkDefaultSvrIp();
      this.ipcRenderer.invoke("home-ready");
    });

    window.addEventListener("keydown", this.keydown);
    document.addEventListener("visibilitychange", this.visibilityChange);
    this.$root.$on("bv::modal::shown", this.watchModal);
    this.$root.$on("bv::modal::hidden", this.watchModal);
  },

  beforeDestroy() {
    this.clearReconnectTimer();
    this.closeWebsocket();
    clearTimeout(this.checkUnreadTimer);
    window.removeEventListener("keydown", this.keydown);
    document.removeEventListener("visibilitychange", this.visibilityChange);
    this.$root.$off("bv::modal::shown", this.watchModal);
    this.$root.$off("bv::modal::hidden", this.watchModal);
  }
};
</script>

<style lang="scss" scoped>
.color-primary {
  color: #007bff;
}
.logo {
  animation: fadeInDown;
  animation-duration: 2000ms;
}
.iconstack {
  animation: rubberBand;
  animation-duration: 2s;
  animation-delay: 2s;
  animation-iteration-count: 2;
  &:hover {
    animation-play-state: paused;
  }
}
.eye {
  cursor: pointer;
  position: absolute;
  right: 2rem;
  top: 0.55rem;
}
.float-preview {
  z-index: 1002;
  position: absolute;
  top: -80px;
  opacity: 0.85;
  border-radius: 15px;
  background-color: gray;
  width: 95%;
}
.float-emoji {
  z-index: 1002;
  position: absolute;
  top: calc(33vh - 66vh - 0px);
  opacity: 0.95;
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
  left: 100px;
}
.notify-personal {
  @include notify();
  left: 350px;
}
.notify-chat {
  @include notify();
  left: 225px;
}
.nav-link:hover .badge {
  opacity: 1;
}
</style>
