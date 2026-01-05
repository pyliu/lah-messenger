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

        //- 聊天列表頻道
        b-nav-item(
          :active="isChat",
          title="通知頻道列表",
          @click="setCurrentChannel('chat')"
        ): a.mr-1
          span.s-105 💬 通知
          b-badge.notify-chat(variant="secondary", pill, v-if="showChatUnread") {{ chatUnread }}

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

      //- 2. 聊天室控制列 (僅在聊天模式顯示)
      transition(name="list", mode="out-in"): b-list-group.my-1(
        v-if="inChatting",
        flush
      ): b-list-group-item: b-link.d-flex.justify-content-between.align-items-center(
        @click="setCurrentChannel('chat')"
      )
        .mr-auto
          b-icon.mr-1(
            icon="arrow-left-circle-fill",
            font-scale="1.25",
            title="返回列表"
          )
          span {{ getChannelName($store.getters.currentChannel) }}

        //- 線上使用者頭像顯示
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
      //- 聊天室列表 (Chat Board)
      transition(name="list", mode="out-in"): chat-board(v-if="showChatBoard")

      //- 訊息列表 (Message Board)
      //- ref="msgBoard" 用於程式控制捲動到底部
      transition(name="list", mode="out-in"): message-board(
        ref="msgBoard",
        v-if="showMessageBoard",
        :list="list",
        @reply="reply"
      )

    //- 4. 訊息輸入區 (Input Group)
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
      //- 工具按鈕群
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

      //- 浮動預覽視窗 (Markdown & Image Preview)
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
      //- Logo 區塊
      .center.mb-5.logo
        b-img(src="tyland.jpg", fluid, style="max-width: 96px")
        H1 {{ $config.appName }}
      .center: b-iconstack#main_logo_icon.iconstack(
        font-scale="6",
        v-cloak
      )
        b-icon(icon="chat-dots", variant="success", flip-h, shift-h="10", shift-v="3", stacked)
        b-icon(icon="chat-text", variant="info", shift-h="-10", shift-v="6", stacked)

      //- 手動登入切換開關 (僅管理員可見)
      .d-flex.justify-content-end: b-checkbox(
        v-if="authority.isAdmin",
        v-model="manualLogin",
        size="sm",
        switch
      ) 手動登入

      //- 管理員手動登入組件
      admin-manual-login(
        v-if="manualLogin",
        :def-id="adAccount",
        :def-name="adName",
        :def-dept="department"
        @connect="handleAdminConnect"
      )
      
      //- 一般自動/AD 驗證登入
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
        .center(v-if="validHost && validPort")
          //- 連線按鈕 (資料完整時)
          b-button(
            v-if="validInformation",
            :variant="queryADVariant",
            :disabled="connecting",
            @click="connect",
            title="連線",
            pill
          )
            b-icon(icon="box-arrow-right" font-scale="1.25")
            span.mx-1 {{ adName }}
            b-badge(variant="light") {{ adAccount }} / {{ deptName }}
          //- 登入/查詢按鈕 (資料不完整時)
          b-button.ld.ld-jump(
            v-else,
            :variant="queryADVariant",
            @click="$refs.adQueryModal.show()",
            pill
          )
            b-icon.mr-1(icon="box-arrow-right" font-scale="1.25")
            span 登入 #[b-badge(v-if="!$utils.empty(adAccount)", variant="light") {{ adAccount }}]

        //- AD 驗證彈出視窗
        b-modal(
          ref="adQueryModal",
          hide-footer,
          centered,
          scrollable,
          no-close-on-backdrop
        )
          template(#modal-title): div(v-html="`AD驗證登入 ${userid}`")
          b-input-group.ml-1(title="AD伺服器IP")
            template(#prepend): .mr-1.my-auto ＡＤ主機
            b-input(v-model="adHost", placeholder="... AD伺服器IP ...", :state="validAdHost", trim)
          b-input-group.ml-1.my-1(:title="`網域帳號`")
            template(#prepend): .mr-1.my-auto 網域帳號
            b-input(v-model="adAccount", :state="validAdAccount", :placeholder="'👨‍💻 網域帳號'", trim)
          b-input-group.ml-1(:title="`${userid}的網域密碼`")
            template(#prepend): .mr-1.my-auto 網域密碼
            b-input(
              :type="adPasswordType",
              v-model="adPassword",
              :state="validAdPassword",
              :placeholder="'🔐 網域密碼'",
              trim,
              @keydown.enter="invokeADQuery"
            )
            b-icon.my-auto.ml-2.eye(
              ref="eye",
              :icon="adPasswordIcon",
              :style="'margin-right: 60px'",
              font-scale="1.25",
              variant="secondary",
              title="切換顯示",
              @click="switchAdPasswordIcon"
            )
            b-button.ml-1(
              :title="`點擊重新查詢 ${userid}`",
              @click="invokeADQuery",
              :variant="disabledAdLoginBtn ? 'outline-primary' : 'primary'",
              :disabled="disabledAdLoginBtn"
            ) 驗證

  //- 全域狀態列 (右下角)
  status(:status-text="connectText")
</template>

<script>
/**
 * @file home.vue
 * @description 應用程式主入口 (渲染進程)。負責 WebSocket 連線管理、訊息分發、狀態維護及核心 UI 佈局。
 * @author Senior Electron Engineer
 */
import trim from "lodash/trim";
import ImageUpload from "~/components/image-upload.vue";

export default {
  transition: "list",
  head: { title: `${process.env.APP}` },
  components: { ImageUpload },

  // ==========================================================================
  // Data: 組件狀態定義
  // ==========================================================================
  data: () => ({
    // --- UI 交互狀態 ---
    emoji: false,           // 表情符號選擇器開關
    image: null,            // 圖片暫存
    inputText: "",          // 輸入框內容
    inputImages: [],        // 貼上的圖片陣列
    connectText: "",        // 狀態列文字 (右下角)
    back: false,            // (未使用) 預留返回標記
    keyCodes: [],           // 記錄按鍵序列 (用於 Konami Code)
    
    // --- AD 驗證與使用者資訊 ---
    adHost: "",             // AD 伺服器 IP
    adAccount: "",          // 網域帳號 (作為主要 User ID)
    adName: "",             // 網域使用者名稱 (顯示名稱)
    adPassword: "",         // 網域密碼
    adPasswordIcon: "eye-slash", // 密碼顯示切換圖示
    adPasswordType: "password",  // 密碼輸入框類型
    department: "",         // 部門代碼
    // 部門選項清單
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
    manualLogin: false,     // 手動登入模式 (管理員用)
    asking: false,          // 是否正在查詢 AD
    
    // --- WebSocket 連線設定 ---
    wsHost: "",             // WebSocket 伺服器 IP
    wsPort: 8081,           // WebSocket 埠號
    connecting: false,      // 連線中狀態鎖
    reconnectMs: 20 * 1000, // 重連間隔 (毫秒)
    
    // --- 定時器與其他 ---
    syncDepartmentTimer: null,
    checkUnreadTimer: null,
    checkUreadDuration: 3 * 60 * 60 * 1000 // 未讀檢查間隔
  }),

  async fetch() {
    // 從 LocalForage 恢復暫存的圖片與訊息
    this.$localForage.getItem(this.imageMementoCacheKey).then((arr) => {
      this.log("回復已上傳的圖檔", `${arr?.length}筆`);
      this.$store.commit("imageMemento", arr || []);
    });
    this.$localForage.getItem(this.messageMementoCacheKey).then((arr) => {
      this.log("回復已儲存的訊息", arr);
      this.$store.commit("messageMemento", arr || []);
    });
  },

  // ==========================================================================
  // Computed: 計算屬性
  // ==========================================================================
  computed: {
    // --- 頻道與權限判斷 ---
    isChat() { return !this.currentChannel.startsWith("announcement") && !this.isPersonal; },
    isPersonal() { return this.adAccount === this.currentChannel; },
    isAnnouncement() { return this.currentChannel === "announcement"; },
    // 部門判斷 helper (可考慮重構為函數或 map)
    isInf() { return this.currentChannel === "inf"; },
    isAdm() { return this.currentChannel === "adm"; },
    isVal() { return this.currentChannel === "val"; },
    isReg() { return this.currentChannel === "reg"; },
    isSur() { return this.currentChannel === "sur"; },
    isAcc() { return this.currentChannel === "acc"; },
    isHr() { return this.currentChannel === "hr"; },
    isSupervisor() { return this.currentChannel === "supervisor"; },
    isLds() { return this.currentChannel === "lds"; },

    // --- UI 顯示邏輯 ---
    connectedUsersOverlapRatio() { return this.connectedUsers.length < 10 ? 0.0 : 0.4; },
    showInputGroup() {
      // 公告頻道與列表頁不顯示輸入框
      return (
        !this.currentChannel.startsWith("announcement") &&
        this.currentChannel !== this.adAccount &&
        this.currentChannel !== "chat"
      );
    },
    showMessageBoard() { return this.currentChannel !== "chat"; },
    showChatBoard() { return this.isChat; },
    inChatting() { return !this.stickyChannels.includes(this.currentChannel); },
    
    // --- 列表與數據 ---
    list() { return this.messages[this.currentChannel] || []; },
    stickyChannels() {
      // 固定顯示的頻道
      return [ "announcement", this.adAccount, "chat" ];
    },
    showUnreadChannels() { return ["announcement", this.adAccount, `announcement_${this.department}`]; },
    chatUnread() {
      // 計算聊天室總未讀數 (排除系統頻道)
      const result = Object.entries(this.unread).reduce((acc, curr) => {
        if (
          parseInt(curr[0]) > 0 ||
          [ "lds", "adm", "sur", "inf", "reg", "val", "acc", "hr", "supervisor" ].includes(curr[0])
        ) {
          return acc + curr[1];
        }
        return acc;
      }, 0);
      return result > 99 ? "99+" : result;
    },
    showChatUnread() { return this.chatUnread > 0 || this.chatUnread === "99+"; },
    deptName() { return this.getDepartmentName(this.department) },

    // --- 連線與驗證資訊 ---
    wsConnStr() { return `ws://${this.wsHost}:${this.wsPort}`; },
    userQueryStr() { return `${this.apiQueryUrl}${this.$consts.API.JSON.USER}`; },
    
    // --- 驗證 (Validation) ---
    valid() { return !this.empty(trim(this.inputText)) || !this.empty(this.inputImages); }, // 發送按鈕是否有效
    validAdHost() { return this.$utils.isIPv4(this.adHost) === false ? false : null; },
    validAdAccount() { return !this.empty(this.adAccount); },
    validAdName() { return !this.empty(this.adName); },
    validAdPassword() { return this.empty(this.adPassword) ? false : null; },
    validHost() { return this.$utils.isIPv4(this.wsHost); },
    validPort() { const i = parseInt(trim(this.wsPort)); return i > 1024 && i < 65535; },
    validDepartment() { return !this.$utils.empty(trim(this.department)); },
    validInformation() {
      return (this.validAdAccount && this.validAdName && this.validDepartment && this.validPort && this.validHost);
    },
    disabledAdLoginBtn() {
      return this.empty(this.adPassword) || this.validAdHost === false || this.validAdAccount === false
    },
    queryADVariant() {
      if (this.empty(this.adAccount)) return "primary";
      if (this.empty(this.adName)) return "warning";
      return "success";
    },

    // --- 通知相關 ---
    notifyChannels() {
      const channels = ["announcement", `announcement_${this.department}`];
      this.notifySettings.personal && channels.push(this.adAccount);
      this.notifySettings.chat && channels.push("lds");
      this.notifySettings.chat && channels.push(this.department);
      return channels;
    },

    // --- Markdown 處理 ---
    markdImages() {
      let imgMdText = this.inputImages
        .map((base64, idx) => `![preview-${idx}](${base64})`)
        .join('\n');
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
        type: "mine",
      };
    },
    // [FIX] 移除了這裡的 totalUnread 函數，因為它屬於副作用，不應在 computed 中。
  },

  // ==========================================================================
  // Watch: 偵聽器
  // ==========================================================================
  watch: {
    connectText(val) { this.$store.commit("statusText", val); },
    
    // [FIX] 新增 totalUnread 偵聽器，解決 IPC 複製錯誤並恢復正確邏輯
    totalUnread(val) {
      this.ipcRenderer.invoke("toggleUnreadTrayIcon", {
        unread: val
      });
    },

    // 頻道切換邏輯 (核心)
    currentChannel(nVal, oVal) {
      this.log(`離開 ${oVal} 頻道，進入 ${nVal} 頻道`);
      
      // 1. 通知伺服器更新頻道
      this.sendChannelUpdate(nVal);
      
      // 2. 初始化 Store 數據
      if (!(nVal in this.messages)) {
        this.$store.commit("addChannel", nVal || this.adAccount);
        this.$store.commit("resetUnread", nVal || this.adAccount);
      }

      // 3. 清理舊頻道訊息 (釋放記憶體)
      this.messages[oVal] && (this.messages[oVal].length = 0);
      
      // 4. 取得新頻道最新訊息
      this.latestMessage();

      // 5. 查詢線上使用者 (除了公告頻道外)
      if (!this.showUnreadChannels.includes(nVal)) {
        this.queryOnlineClients();
      }
      
      // 6. UI 重置
      this.clear();
      this.scrollToBottom();
    },

    // 連線參數變動監聽 -> 觸發重連計時器重置
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
    },
    manualLogin(flag) {
      if (flag) {
        this.clearReconnectTimer();
        this.reconnectMs = 20 * 1000;
      } else {
        this.resetReconnectTimer();
      }
    },

    // 使用者資訊變動監聽 -> 持久化存儲
    userid(val) { !this.empty(val) && val !== this.adAccount && (this.adAccount = val); },
    adHost(val) { this.$store.commit("ad", val); this.$localForage.setItem("adHost", val); },
    adAccount(val) { this.$localForage.setItem("adAccount", val); this.$store.commit("userid", val); },
    adName(val) { this.$localForage.setItem("adName", val); this.$store.commit("username", val); },
    adPassword(val) { this.$store.commit("password", val); this.$localForage.setItem("adPassword", val); },
    
    // UI 相關監聽
    fetchingHistory(flag) { this.isBusy = flag; },
    inputImages() { this.adjustPreviewPosition(); },
    inputText() { this.$nextTick(() => this.adjustPreviewPosition()); },
    
    // Konami Code 處理
    keyCodes() { this.handleKonamiCode(); },

    // API 回傳資訊處理
    apiUserinfo(val) { this.handleApiUserInfoUpdate(val); }
  },

  // ==========================================================================
  // Methods: 方法定義
  // ==========================================================================
  methods: {
    // ------------------------------------------------------------------------
    // [UI Interaction] 介面交互與輔助
    // ------------------------------------------------------------------------
    /**
     * 強制捲動訊息列表到底部
     * 使用 requestAnimationFrame 確保在 Vue Transition 與瀏覽器繪製期間持續捲動
     */
    scrollToBottom() {
      this.$nextTick(() => {
        const el = this.$refs.msgBoard?.$el;
        if (!el) return;
        let start = null;
        const duration = 300; // 配合 Vue transition 時間
        const step = (timestamp) => {
          if (!start) start = timestamp;
          const progress = timestamp - start;
          if (el) el.scrollTop = el.scrollHeight;
          if (progress < duration) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
      });
    },

    adjustPreviewPosition() {
      if (this.$refs.floatPreview) {
        this.$refs.floatPreview.style.top = "-" + this.$refs.floatPreview.offsetHeight + "px";
      }
    },

    clear() {
      this.inputText = "";
      this.inputImages = [];
    },

    // --- 輸入框與表情/圖片處理 ---
    pasted(base64) { !this.inputImages.includes(base64) && this.inputImages.push(base64); },
    removeInoutImage(base64data) {
      const index = this.inputImages.indexOf(base64data);
      if (index > -1) this.inputImages.splice(index, 1);
    },
    emojiPickup() { this.emoji = !this.emoji; },
    addEmoji(emoji) {
      this.emoji = false;
      const element = this.$refs.textarea;
      if (element && element.selectionStart) {
        const st = element.selectionStart;
        const ed = element.selectionEnd;
        const front = this.inputText.substring(0, st).trim();
        const appended = front + " " + emoji + " ";
        const tail = this.inputText.substring(ed, this.inputText.length).trim();
        this.inputText = appended + tail;
        element.focus();
        this.$nextTick(() => { element.selectionEnd = appended.length; });
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
            publish: (base64EncodedData) => {
              this.sendImage(base64EncodedData, "上傳圖片", this.currentChannel);
            },
          },
        }),
        { id: "image-upload-modal", size: "xl", title: `直接傳送圖片` }
      );
    },
    reply(raw) {
      const sender = this.userMap[raw["sender"]] || raw["sender"];
      const hrIdx = raw["message"]?.indexOf("<hr>");
      const text = hrIdx === -1 ? raw["message"] : raw["message"].substring(hrIdx + 4);
      const tmp = document.createElement("DIV");
      tmp.innerHTML = `@${sender} ${text}`;
      let innerText = tmp.textContent || tmp.innerText || "";
      if (this.$utils.length(innerText) > 20) {
        innerText = innerText.substring(0, 20) + " ... ";
      }
      this.inputText = `${innerText}\n\n***\n\n`;
      this.$nextTick(() => {
        this.$refs.textarea.$el.scrollTop = 999999;
        this.$refs.textarea?.focus();
      });
    },

    // ------------------------------------------------------------------------
    // [Authentication] 驗證與使用者資料
    // ------------------------------------------------------------------------
    switchAdPasswordIcon() {
      if (this.adPasswordIcon === "eye") {
        this.adPasswordIcon = "eye-slash";
        this.adPasswordType = "password";
      } else {
        this.adPasswordIcon = "eye";
        this.adPasswordType = "text";
      }
    },

    /**
     * 觸發 AD 查詢 (呼叫 Main Process)
     */
    invokeADQuery() {
      if (this.asking === true) { this.connectText = `AD查詢中`; return; }
      if (this.empty(this.adPassword) || this.validAdAccount === false || this.validAdHost === false) {
        this.connectText = `缺漏必要欄位無法查詢`;
        return;
      }
      this.$refs.adQueryModal.hide();
      this.adName = this.userMap[this.adAccount] || this.adAccount;
      this.asking = true;
      this.log(this.time(), `透過AD查詢使用者資訊`);
      
      const sAMAccountName = `${this.adAccount}@${this.domain}`;
      this.ipcRenderer.invoke("ad-user-query", {
          url: `ldap://${this.adHost}`,
          baseDN: `DC=${this.domain.split(".").join(",DC=")}`,
          username: sAMAccountName,
          password: this.adPassword,
        })
        .then((result) => {
          const group = result.group;
          const desc = result.description;
          const name = desc || this.userMap[this.adAccount] || this.adAccount;
          this.$store.commit("userid", this.adAccount);
          this.$store.commit("username", name);
          this.adName = name;
          this.department = group;
          this.connectText = `AD: ${this.adAccount} ${name} ${group}`;
          this.connect();
        })
        .catch((err) => {
          console.error(err);
          this.alert(`查詢 ${sAMAccountName} 帳號失敗，密碼錯誤!?`, { title: `ldap://${this.adHost}` });
        })
        .finally(() => {
          this.asking = false;
        });
    },

    // 從 API Server 載入使用者權限
    loadApiUserData() {
      if (this.validHost) {
        this.$axios.post(this.userQueryStr, { type: "authentication", ip: this.ip })
          .then(({ data }) => {
            if (this.$utils.statusCheck(data.status)) {
              this.setCache("userAuthority", data.authority, this.userDataCacheDuration);
              this.setCache("apiUserinfo", data.info, this.userDataCacheDuration);
              this.$store.commit("authority", data.authority);
              this.$store.commit("apiUserinfo", data.info);
            } else {
              this.warning(data.message);
            }
          })
          .catch((err) => this.alert(err.toString()));
      } else {
        this.timeout(this.loadApiUserData, 400);
      }
    },
    
    loadUserMapData() {
      if (this.validHost) {
        this.$axios.post(this.userQueryStr, { type: "user_mapping" })
          .then(({ data }) => {
            if (this.$utils.statusCheck(data.status)) {
              this.$store.commit("userMap", data.data);
              this.setCache("userMap", data.data, this.userDataCacheDuration);
            } else {
              this.warning(data.message);
            }
          })
          .catch((err) => this.alert(err.toString()));
      } else {
        this.timeout(this.loadUserMapData, 400);
      }
    },

    // ------------------------------------------------------------------------
    // [WebSocket Core] 連線核心邏輯
    // ------------------------------------------------------------------------
    /**
     * 建立 WebSocket 連線
     * 包含事件綁定 (onopen, onmessage, onerror, onclose)
     */
    connect() {
      this.syncApiDepartment();
      if (this.connected) {
        this.log(this.time(), "已連線，略過檢查");
        this.connectText = "";
        this.reconnectMs = 20 * 1000;
        this.resetReconnectTimer();
      } else if (this.validInformation) {
        this.connecting = true;
        try {
          this.websocket && this.websocket.close();
          this.connectText = "連線中";
          const ws = new WebSocket(this.wsConnStr);
          
          ws.onopen = (e) => {
            this.$store.commit("websocket", ws);
            this.log(this.time(), "已連線", e);
            this.register(); // 向伺服器註冊客戶端資訊
            this.list.length = 0;
            this.delayLatestMessage(); // 獲取當前頻道訊息
            this.connectText = "已上線";
            this.connecting = false;
          };
          
          ws.onclose = (e) => {
            this.$store.commit("websocket", undefined);
            this.connectText = `等待重新連線中(${this.wsConnStr})`;
            this.connecting = false;
          };
          
          ws.onerror = (e) => {
            this.$store.commit("websocket", undefined);
            this.connectText = `'WS伺服器連線出錯'`;
            this.connecting = false;
          };
          
          ws.onmessage = async (e) => this.handleWebSocketMessage(e);

        } catch (e) {
          this.connectText = "連線錯誤";
          console.error(e);
          this.closeWebsocket();
        } finally {
          this.timeout(() => (this.back = false), 1000);
        }
      } else {
        // 未登入處理
        this.connectText = '請先登入系統';
        if (this.reconnectMs < 640 * 1000) {
          this.reconnectMs *= 2; // 指數退避策略
          this.resetReconnectTimer();
        }
        this.ipcRenderer.invoke('notification', { message: "請登入即時通以讀取最新訊息！", showMainWindow: false });
      }
    },

    /**
     * 處理收到的 WebSocket 訊息
     */
    async handleWebSocketMessage(e) {
      const incoming = JSON.parse(e.data);
      const channel = incoming.channel;
      const receivedId = incoming.message.id || incoming.id;
      const lastReadId = (await this.getChannelLastReadId(channel)) || 0;

      this.connectText = `收到 ${this.getChannelName(channel)} 訊息`;

      if (incoming.type === "ack") {
        this.handleAckMessage(incoming.message);
      } else if (channel === "system") {
        this.handleSystemMessage(incoming.message);
      } else if (this.currentChannel === channel) {
        // 處理當前頻道的訊息
        !Array.isArray(this.messages[channel]) && this.$store.commit("addChannel", channel);
        this.$nextTick(() => {
          if (!this.$utils.empty(incoming.message)) {
            if (incoming.prepend) {
              this.messages[channel].unshift(incoming);
            } else {
              const found = this.messages[channel].find((msg) => msg.id === incoming.id);
              if (!found) {
                this.messages[channel].push(incoming);
                if (receivedId > lastReadId) {
                  this.setChannelUnread(channel, receivedId);
                }
                this.triggerNotification(incoming);
                this.delayLatestMessage(); // 觸發列表重整
                this.scrollToBottom();
              }
            }
          }
        });
      } else if (incoming.message && incoming.sender !== "system") {
        // 處理背景頻道的未讀計數
        if (parseInt(this.unread[channel]) === NaN) {
          this.resetUnread(channel);
        }
        if (receivedId > lastReadId) {
          if (this.currentChannel !== channel && ['lds', 'announcement', `announcement_${this.userdept}`, this.userid, this.userdept].includes(channel)) {
            this.plusUnread(channel);
          }
        }
        this.triggerNotification(incoming);
      }
      this.connecting = false;
    },

    /**
     * 處理系統 ACK (確認) 訊息
     * 包含：註冊成功、頻道增刪、訊息編輯/刪除、已讀狀態更新
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
          this.handleRemoveMessageAck(json);
          break;
        case "edit_message":
          this.handleEditMessageAck(json);
          break;
        case "previous":
          this.$store.commit("fetchingHistory", false);
          this.connectText = `${json.message}(${json.payload.count}筆)`;
          break;
        case "unread":
          this.$store.commit("setUnread", { channel: json.payload.channel, count: json.payload.unread });
          break;
        case "online":
          this.$store.commit("connectedUsers", json.payload.users.filter(n => n));
          break;
        case "private_message":
          this.handlePrivateMessageAck(json);
          break;
        case "set_read":
        case "check_read":
          this.handleReadStatusAck(json, cmd);
          break;
        default:
          console.warn(`收到未支援指令 ${cmd} ACK`, json);
      }
    },
    
    // --- ACK 處理拆分出的子方法 ---
    handleRemoveMessageAck(json) {
      if (json.success) {
        const idx = this.messages[json.payload.channel]?.findIndex(msg => msg.id === json.payload.id);
        if (idx > -1) this.messages[json.payload.channel].splice(idx, 1);
        
        // 處理 Cascade (連動刪除)
        const cascade = json.payload.cascade;
        if (cascade?.to && cascade?.id) {
          this.websocket.send(JSON.stringify({
            type: "command", sender: this.adAccount, date: this.date(), time: this.time(), channel: 'system',
            message: JSON.stringify({ command: 'remove_message', channel: cascade.to, id: cascade.id, cascade: '' })
          }));
        }
      } else {
        this.err(json); this.alert(`${json.message}`);
      }
      this.connectText = `${json.message}`;
    },

    handleEditMessageAck(json) {
      if (json.success) {
        const channel = json.payload.channel;
        const payload = json.payload.payload;
        const found = this.messages[channel]?.find(msg => msg.id === payload.id);
        if (found) {
          if (channel.startsWith('announcement')) {
            found.message = { ...payload };
          } else {
            // 一般訊息處理
            found.message = payload.message;
            const cascade = json.payload.cascade;
            if (cascade?.id && cascade?.to) {
              // 連動編輯
              delete json.payload.cascade;
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
      }
    },

    handlePrivateMessageAck(json) {
      const insertedId = json.payload.insertedId;
      const insertedChannel = json.payload.channel;
      // 若不是自己的頻道或公告，則需要將發送的私訊同步到自己的視圖中
      if (insertedChannel !== this.adAccount && !insertedChannel?.startsWith("announcement") && !this.chatRooms.includes(insertedChannel)) {
        const remove = JSON.stringify({ to: insertedChannel, id: insertedId });
        this.websocket.send(this.packMessage(json.payload.message, {
          channel: this.adAccount, title: remove, priority: 4, flag: 1, // flag 1 = 自發私訊
        }));
      }
      this.connectText = `${json.message}`;
    },

    handleReadStatusAck(json, cmd) {
       // set_read 與 check_read 邏輯類似，更新 flag
       const targetList = cmd === 'set_read' ? this.messages[json.payload.channel] : this.messages[json.payload.sender];
       if (Array.isArray(targetList)) {
         const msgId = cmd === 'set_read' ? json.payload.id : json.payload.senderChannelMessageId;
         const found = targetList.find(m => m?.id === msgId);
         if (found && (found.flag & 2) !== 2) found.flag += 2;
       }
       // set_read 的 cascade 處理
       if (cmd === 'set_read' && json.cascade) {
         const myList = this.messages[this.adAccount];
         if (Array.isArray(myList)) {
           const found = myList.find(m => {
             const rm = JSON.parse(m.remove || m.title);
             return rm?.to === json.payload.channel && parseInt(rm?.id) === parseInt(json.payload.id);
           });
           if (found) {
             this.websocket.send(JSON.stringify({
               type: "command", sender: this.adAccount, date: this.date(), time: this.time(), channel: "system",
               message: { command: "set_read", channel: found.channel, id: found.id, flag: found.flag, sender: this.adAccount, cascade: false }
             }));
           }
         }
       }
    },

    /**
     * 處理系統主動推送訊息 (update_user, user_connected 等)
     */
    async handleSystemMessage(json) {
      const cmd = json.command;
      const payload = json.payload;
      this.log(this.time(), `處理系統訊息: ${cmd}`, json);
      
      switch (cmd) {
        case "update_user":
          // 使用者資料變更，強制更新 LocalForage 並重整
          if (typeof payload === 'object' && payload.id) {
            await this.$localForage.setItem("adAccount", payload.id);
            await this.$localForage.setItem("adName", payload.name);
            await this.$localForage.setItem("department", payload.dept);
            this.refreshApiDepartment(payload.dept);
            this.connectText = "♻ 登入資訊更新，重新整理頁面";
            this.ipcRenderer.invoke("reload");
          }
          break;
        case "user_connected":
          this.connectText = json.message;
          if (!this.connectedUsers.find(u => u.userid === payload.userid)) {
            this.connectedUsers.push(payload);
          }
          break;
        case "user_disconnected":
          this.connectText = json.message;
          const idx = this.connectedUsers.findIndex(u => u.userid === payload.userid);
          if (idx > -1) this.connectedUsers.splice(idx, 1);
          break;
        default:
          this.log(this.time(), `未支援的命令 ${cmd}`, json);
      }
    },

    // ------------------------------------------------------------------------
    // [Channel & Message] 頻道與訊息邏輯
    // ------------------------------------------------------------------------
    /**
     * 發送訊息 (主要入口)
     */
    send() {
      const text = trim(this.inputText);
      // 本地指令處理
      if (text === "@clearCache") {
        this.$localForage.clear().then(() => this.notify(`本機記憶資料已清除`, { type: "success" }));
      } else if (text === "@settings") {
        this.$router.push("/settings");
      }

      if (this.sendTo(this.markdMessage, { channel: this.currentChannel })) {
        this.clear();
      }
      this.$refs.textarea && this.$refs.textarea.focus();
    },

    sendTo(message, opts = {}) {
      message = trim(message);
      !this.connected && this.connect();
      if (!this.$utils.empty(message)) {
        if (this.connected) {
          const jsonStr = this.packMessage(message, { channel: this.currentChannel, ...opts });
          this.websocket.send(jsonStr);
          return true;
        } else {
          this.notify(`伺服器連線${this.status(this.websocket.readyState)} ... 無法傳送訊息`, { type: "warning", pos: "tf" });
        }
      }
      return false;
    },

    register() {
      if (this.connected && this.validAdAccount && this.validAdName) {
        this.websocket.send(this.packCommand({
          command: "register", ip: this.ip, domain: this.domain, userid: this.adAccount,
          username: this.adName, dept: this.department, timestamp: +new Date(), channel: this.currentChannel
        }));
        this.reportToAPIServer();
        this.checkUnread();
      } else if (!this.connected) {
        this.log(this.time(), "尚未連線無法登錄客戶端資料");
      }
    },
    
    // 獲取最新訊息
    latestMessage() {
      const channel = this.currentChannel;
      if (this.connected) {
        const loadCount = this.messages[channel]?.length > 15 ? this.messages[channel]?.length : 15;
        const jsonString = JSON.stringify({
          type: "command", sender: this.adAccount, date: this.date(), time: this.time(), channel: "system",
          message: JSON.stringify({ command: "latest", channel: channel, count: loadCount })
        });
        this.websocket.send(jsonString);
      }
    },

    // ------------------------------------------------------------------------
    // [Electron IPC] 主進程通訊
    // ------------------------------------------------------------------------
    ipcRendererSetup() {
      const { ipcRenderer } = require("electron");
      this.ipcRenderer = ipcRenderer;
      this.ipcRenderer.removeAllListeners("quit");
      this.ipcRenderer.removeAllListeners("set-current-channel");
      
      this.ipcRenderer.on("quit", () => this.sendAppCloseActivity());
      this.ipcRenderer.on("set-current-channel", (e, channel) => this.setCurrentChannel(channel));
      this.ipcRenderer.on("in-browser-notify", (e, payload) => {
        if (payload.statusOnly) {
          this.$store.commit("statusText", payload.message);
        } else {
          this.notify(payload.message, { type: payload.type || 'info', title: payload.title || '📢 通知' });
        }
      });
    },

    async triggerNotification(incoming) {
      const channel = incoming.channel;
      const receivedId = incoming.message.id || incoming.id;
      const lastReadId = (await this.getChannelLastReadId(channel)) || 0;
      if (receivedId > lastReadId) {
        this.ipcRenderer.invoke("unread", channel);
        this.invokeNotification(incoming);
      }
    },

    async invokeNotification(incoming) {
      const channel = incoming.channel;
      const temp = document.createElement("div");
      temp.innerHTML = incoming.message.title || incoming.message;
      const title = temp.innerText.substring(0, 18) + " ... ";

      this.warn(`Notification Trigger: ${incoming.sender} -> ${this.adAccount} (${channel})`, title);
      this.setCache(`${channel}_last_id`, incoming.message.id || incoming.id);
      
      if (incoming.sender !== this.adAccount && this.notifyChannels.includes(channel)) {
        this.ipcRenderer.invoke('notification', { message: title, showMainWindow: true });
      }
    },

    // ------------------------------------------------------------------------
    // [Utils & Helpers] 其他輔助方法
    // ------------------------------------------------------------------------
    status(code) {
      switch (code) {
        case 0: return "連線中";
        case 1: return "已連線";
        case 2: return "關閉中";
        case 3: return "已關閉";
        default: return `未定義(${code})`;
      }
    },
    resetReconnectTimer() {
      this.clearReconnectTimer();
      if (this.timer === null && this.$route.name === "home") {
        this.$store.commit("timer", setInterval(() => {
            this.connectText = "檢查連線狀態";
            this.connect();
          }, this.reconnectMs)
        );
      }
    },
    // Konami Code / 鍵盤事件
    keydown(event) {
      if (event.defaultPrevented) return;
      this.keyCodes.push(event.keyCode);
      this.keyCodes.length > 10 && this.keyCodes.shift();
    },
    handleKonamiCode() {
      const md5 = this.$utils.md5(this.keyCodes.join(","));
      if (md5 === "f20b4566a1f6b848f1fbec48b2ab2c10") {
        // Toggle Admin
        this.$store.commit("authority", { isAdmin: !this.authority.isAdmin });
        this.keyCodes.length = 0;
        this.notify(this.authority.isAdmin ? "🌟 提升為管理者" : "⚠️ 移除管理者權限");
      } else if (md5 === "21ea03e57ae8281916206c6710dc3e35") {
        // Reset
        this.$localForage.clear().then(() => this.ipcRenderer.invoke("reload"));
      }
    },
    // 占位符 (Debounced methods)
    delayConnect() {},
    delayLatestMessage() {},
    delaySendChannelActivity() {},
    debouncedQueryOnlineClients() {},

    // 其他較少修改的方法...
    visibilityChange() { this.$store.commit("windowVisible", !document.hidden); },
    watchModal(bvEvent, modalId) {
      if (bvEvent?.type === 'shown') {
        this.$store.commit("lastModalId", modalId);
        this.clearReconnectTimer();
        this.reconnectMs = 20 * 1000;
      } else {
        this.resetReconnectTimer();
      }
    },
    addCurrentChannel() {
      if (!(this.currentChannel in this.messages) && !this.$isServer) {
        this.$store.commit("addChannel", this.currentChannel);
        this.$store.commit("resetUnread", this.currentChannel);
      }
    },
    // AD/API 相關輔助
    async getChannelLastReadId(channel) { return (await this.getCache(`${channel}_last_id`)) || 0; },
    setChannelUnread(channel, unreadId) { this.setCache(`${channel}_last_id`, unreadId); },
    queryUnreadCount() {
      ["announcement", `announcement_${this.userdept}`, this.adAccount, "lds", this.userdept].forEach(c => this.queryChannelUnreadCount(c));
    },
    async queryChannelUnreadCount(channel) {
      const lastReadId = await this.getChannelLastReadId(channel);
      this.websocket.send(JSON.stringify({
        type: "command", sender: this.adAccount, date: this.date(), time: this.time(), channel: "system",
        message: JSON.stringify({ command: "unread", channel: channel, last: lastReadId })
      }));
    },
    async checkDefaultSvrIp() {
      this.wsHost = await this.$localForage.getItem("wsHost");
      if (this.$utils.empty(this.wsHost)) {
        this.wsHost = this.defaultSvrIp || (await this.timeout(this.checkDefaultSvrIp, 400));
      }
    },
    reportToAPIServer() {
      this.ipcRenderer.invoke("add-ip-entry", {
        api: `${this.apiQueryUrl}${this.$consts.API.JSON.IP}`, type: "add_user_ip_entry",
        note: `${this.domain} ${this.department}`, added_type: "DYNAMIC", entry_type: "USER", entry_id: this.adAccount, entry_desc: this.adName,
      });
    },
    refreshApiDepartment(val) {
      if (!this.$utils.empty(val)) {
        const deptname = this.getDepartmentName(val);
        this.$store.commit('apiUserinfo', { unit: deptname });
        this.ipcRenderer.invoke("change-user-dept", {
          api: `${this.apiQueryUrl}${this.$consts.API.JSON.USER}`, type: "upd_dept", id: this.userid, dept: deptname
        });
      }
    },
    async syncApiDepartment() {
       if (!this.$utils.empty(this.apiUserinfo)) {
         const apiDeptName = this.apiUserinfo?.unit;
         if (this.deptName !== apiDeptName) {
           this.warning(`您的部門(${this.deptName})已修正為${apiDeptName}，如欲變更請洽管理者。`);
           this.handleApiUserInfoUpdate(this.apiUserinfo);
         }
       }
    },
    handleApiUserInfoUpdate(val) {
      const map = { '資訊課': 'inf', '行政課': 'adm', '登記課': 'reg', '測量課': 'sur', '地價課': 'val', '人事室': 'hr', '會計室': 'acc' };
      this.department = map[val?.unit] || 'supervisor';
    },
    getDepartmentName(val) {
      const map = { 'inf': '資訊課', 'adm': '行政課', 'reg': '登記課', 'sur': '測量課', 'val': '地價課', 'hr': '人事室', 'acc': '會計室', 'supervisor': '主任祕書室' };
      return map[val] || '未知部門';
    },
    checkUnread() {
      clearTimeout(this.checkUnreadTimer);
      if (this.totalUnread > 0) {
        this.ipcRenderer.invoke('notification', { message: `您有 ${this.totalUnread} 個未讀訊息!`, showMainWindow: false });
      } else {
        this.$store.commit('resetUnreadAll');
      }
      this.timeout(this.checkUnread, this.$config.isDev ? 30 * 1000 : this.checkUreadDuration).then(h => this.checkUnreadTimer = h);
    },
    // 用於處理 Admin 登入的回調
    handleAdminConnect(info) {
      this.wsHost = info.host;
      this.wsPort = info.port;
      this.adAccount = info.id;
      this.adName = info.name;
      this.department = info.dept;
      this.manualLogin = false;
      this.resetReconnectTimer();
      this.connect();
    },
    // 頻道更新活動通知
    sendChannelUpdate(channel) {
      if (this.connected) {
        this.log(`發送頻道更新至伺服器: ${this.adAccount} ${channel}`);
        this.websocket.send(this.packCommand({ command: "update_current_channel", channel: channel, userid: this.adAccount }));
      }
    },
    // 頻道進出活動通知 (Debounced)
    sendChannelActivity(oVal, nVal) {
      if (this.connected) {
        const oCName = this.getChannelName(oVal);
        const nCName = this.getChannelName(nVal);
        if (!this.stickyChannels.includes(oVal) && this.currentChannel !== oVal) {
          this.sendTo(`${this.username || this.adAccount} 離開 ${oCName} 頻道`, { sender: "system", channel: oVal });
        }
        if (!this.stickyChannels.includes(nVal) && this.currentChannel === nVal) {
          this.sendTo(`${this.username || this.adAccount} 進入 ${nCName} 頻道`, { sender: "system", channel: nVal });
        }
      }
    },
    // 程式關閉通知
    sendAppCloseActivity() {
      const cName = this.getChannelName(this.currentChannel);
      if (!this.stickyChannels.includes(this.currentChannel)) {
        this.sendTo(`${this.username || this.adAccount} 離開 ${cName} 頻道 (程式已關閉)`, { sender: "system", channel: this.currentChannel });
      }
    },
    // 初始化使用者資訊
    queryUserInfo() {
      this.$localForage.getItem("userinfo").then((userinfo) => {
        if (userinfo) this.setUserInfo(userinfo);
        else this.ipcRenderer.invoke("userinfo").then((u) => this.setUserInfo(u));
      });
    },
    async setUserInfo(userinfo) {
      if (this.empty(userinfo?.userid)) userinfo.userid = this.adAccount;
      this.$store.commit("userinfo", userinfo);
      this.$localForage.setItem("userinfo", userinfo);
      
      if (!this.$utils.isIPv4(this.adHost)) this.adHost = this.getFirstDNSIp();
      
      // 設定視窗標題
      const parts = [];
      if (this.ip.startsWith('192.168.') || this.ip.startsWith('220.1.')) parts.push(this.ip);
      !this.empty(this.adAccount) && parts.push(this.adAccount);
      const cached = await this.$localForage.getItem("adName");
      if (this.adAccount !== cached && !this.empty(cached)) parts.push(cached);
      parts.push(this.pcname);
      this.ipcRenderer.invoke("title", parts.join(' / '));
      
      this.register();
      this.ipcRenderer.invoke("injectUserinfo", { ...userinfo, userdept: this.userdept });
    },
    // 還原設定
    async restoreSettings() {
      this.adAccount = await this.$localForage.getItem("adAccount");
      this.adName = await this.$localForage.getItem("adName");
      this.adPassword = await this.$localForage.getItem("adPassword");
      this.department = await this.$localForage.getItem("department");
      this.adHost = await this.$localForage.getItem("adHost");
      this.wsHost = await this.$localForage.getItem("wsHost");
      this.wsPort = await this.$localForage.getItem("wsPort") || 8081;
      this.$store.commit("effect", await this.$localForage.getItem("effect"));
      this.$store.commit("history", (await this.$localForage.getItem("history")) || 15);
      this.$store.commit("fetchingHistory", false);
      this.$store.commit("apiHost", this.wsHost);
      this.$store.commit("apiPort", parseInt(await this.$localForage.getItem("apiPort")) || 80);
      this.$store.commit("fePort", parseInt(await this.$localForage.getItem("fePort")) || 8080);
      this.$store.commit("resetUnread", this.adAccount);
      this.$store.commit("notifySettings", { ...this.notifySettings, ...(await this.$localForage.getItem("notifySettings")) });
    },
    // 管理聊天室頻道
    addChatChannel(payload) {
      this.$store.commit("addParticipatedChannel", { id: payload.id, name: payload.name, participants: payload.participants, type: payload.type });
    },
    removeChatChannel(payload) {
      this.$store.commit("removeParticipatedChannel", { id: payload.id, name: payload.name, participants: payload.participants, type: payload.type });
    },
    queryMyChannel() {
      try {
        const jsonString = JSON.stringify({ type: "command", sender: this.adAccount, date: this.date(), time: this.time(), message: JSON.stringify({ command: "mychannel" }), channel: "system" });
        this.websocket.send(jsonString);
        return true;
      } catch (e) { this.warning(`無法傳送 mychannel 命令 (${e.toString()})`); }
      return false;
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
    // 初始化 Debounce 函數 (使用 $utils)
    this.delayConnect = this.$utils.debounce(this.connect, 1500);
    this.delayLatestMessage = this.$utils.debounce(this.latestMessage, 400);
    this.delaySendChannelActivity = this.$utils.debounce(this.sendChannelActivity, 0.5 * 1000);
    this.debouncedQueryOnlineClients = this.$utils.debounce(this.queryOnlineClients, 1000);

    this.resetReconnectTimer();

    this.$nextTick(async () => {
      await this.restoreSettings();
      // 載入使用者對應表
      const mapping = await this.getCache("userMapping");
      if (mapping === false) this.loadUserMapData();
      else this.$store.commit("userMap", mapping);
      
      // 檢查使用者權限
      const authority = await this.getCache("userAuthority");
      const apiUserinfo = await this.getCache("apiUserinfo");
      if (authority === false || apiUserinfo === false) this.loadApiUserData();
      else {
        this.$store.commit("authority", authority);
        this.$store.commit("apiUserinfo", apiUserinfo);
      }
      
      this.checkDefaultSvrIp();
      this.ipcRenderer.invoke("home-ready");
      this.warn("CONFIG", this.$config);
    });

    // 綁定全域事件
    window.addEventListener("keydown", this.keydown);
    document.addEventListener("visibilitychange", this.visibilityChange);
    this.$store.commit("windowVisible", !document.hidden);
    this.$root.$on('bv::modal::shown', this.watchModal);
    this.$root.$on('bv::modal::hidden', this.watchModal);
  },
  beforeDestroy() {
    this.clearReconnectTimer();
    this.closeWebsocket();
    clearTimeout(this.checkUnreadTimer);
    window.removeEventListener("keydown", this.keydown);
    document.removeEventListener("visibilitychange", this.visibilityChange);
    this.$root.$off('bv::modal::shown', this.watchModal);
    this.$root.$off('bv::modal::hidden', this.watchModal);
  }
};
</script>

<style lang="scss" scoped>
.color-primary { color: #007bff; }
.logo {
  animation: fadeInDown;
  animation-duration: 2000ms;
}
.iconstack {
  animation: rubberBand;
  animation-duration: 2s;
  animation-delay: 2s;
  animation-iteration-count: 2;
  &:hover { animation-play-state: paused; }
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
.notify-announcement { @include notify(); left: 100px; }
.notify-personal { @include notify(); left: 350px; }
.notify-chat { @include notify(); left: 225px; }
.nav-link:hover .badge { opacity: 1; }
</style>