<template lang="pug">
div: client-only
  //- =========================================================================
  //- 主要應用程式區塊 (已連線狀態)
  //- =========================================================================
  transition(v-if="connected", name="list", mode="out-in"): .main-layout
    b-card.m-1.main-card(no-body, header-tag="nav", v-cloak)
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

        //- 線 picked Users Avatar Group
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
      transition(name="list", mode="out-in"): chat-board.scrollable-board(v-if="showChatBoard")
      //- 訊息內容列表 (Message Board)
      transition(name="list", mode="out-in"): message-board.scrollable-board(
        ref="msgBoard",
        v-if="showMessageBoard",
        :list="list",
        @reply="reply"
      )

    //- 4. 訊息輸入區
    transition(name="listY", mode="out-in"): b-input-group.p-1.flex-shrink-0(
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
        @keydown="delayConnect($event); onKeydown($event)",
        @blur="closeHistory",
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
      b-button.ml-1(
        @click="pickAttachment",
        variant="outline-info",
        title="附加檔案"
      )
        b-icon(icon="paperclip")
      input(
        ref="fileInput",
        type="file",
        multiple,
        :accept="attachmentAcceptAttr",
        style="display: none",
        @change="handleFileChange"
      )
      input-history(
        :open="historyOpen",
        :list="historyList",
        :index="historyIndex",
        @choose="chooseHistory",
        @hover="historyIndex = $event"
      )

      //- 待上傳附件清單
      .d-flex.flex-wrap.align-items-center.w-100.mt-1.p-1.bg-light.rounded(v-if="uploadFiles.length > 0")
        span.small.text-muted.mr-1 附件 ({{ uploadFiles.length }}):
        b-badge.mr-1.mb-1.p-1(
          v-for="(f, fIdx) in uploadFiles",
          :key="`home_att_${fIdx}`",
          variant="info"
        )
          b-icon.mr-1(icon="paperclip")
          span {{ f.name }} ({{ formatFileSize(f.size) }})
          b-icon.ml-1(icon="x-circle", style="cursor: pointer;", @click="removeUploadFile(fIdx)")

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
  home-login(
    v-else,
    :manual-login.sync="manualLogin",
    :ad-account="adAccount",
    :ad-name="adName",
    :department="department",
    :dept-name="deptName",
    :avatar-text="avatarText",
    :valid-host="validHost",
    :ws-host="wsHost",
    :ws-port="wsPort",
    :connecting="connecting",
    :valid-information="validInformation",
    :valid-ad-account="validAdAccount",
    :is-admin="authority.isAdmin",
    @admin-connect="handleAdminConnect",
    @enter="handleManualEnter"
  )

    //- 右下角狀態列
  status(:status-text="connectText")
</template>

<script>
/**
 * @file home.vue
 * @description 桃園即時通應用程式主入口組件。
 */

import InputHistory from "~/components/input-history.vue";
import inputHistoryMixin from "~/mixins/input-history";
import homeStatusQueueMixin from "~/mixins/home-status-queue";
import homeDesktopMixin from "~/mixins/home-desktop";
import homeInputMixin from "~/mixins/home-input";
import homeAuthMixin from "~/mixins/home-auth";
import homeWsMixin from "~/mixins/home-ws";
import HomeLogin from "~/components/home-login.vue";

export default {
  transition: "list",
  head: {
    title: `${process.env.APP}`
  },
  mixins: [
    inputHistoryMixin,
    homeStatusQueueMixin,
    homeDesktopMixin,
    homeInputMixin,
    homeAuthMixin,
    homeWsMixin
  ],
  components: {
    InputHistory,
    HomeLogin
  },

  // ==========================================================================
  // Data: 組件狀態定義
  // ==========================================================================
  data: () => ({
    // --- UI 互動狀態 ---
    currentFontSize: 'normal', // 記錄當前字體大小設定


    // --- 鍵盤監聽與快捷鍵 ---
    back: false,
    keyCodes: [],

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
    // 依據當前字體大小決定一排最多可容納幾個 Avatar 不重疊 (大: 5, 中: 6, 正常: 7)
    maxUnwrappedAvatars() {
      if (this.currentFontSize === 'large') return 5;
      if (this.currentFontSize === 'medium') return 6;
      return 7; // normal
    },
    connectedUsersOverlapRatio() {
      const count = this.connectedUsers.length;
      // 若人數小於或等於該字體下的不換行上限，則完全不重疊 (0.0)
      if (count <= this.maxUnwrappedAvatars) {
        return 0.0;
      }
      // 超過上限時動態計算壓縮比例，確保所有成員可在一排呈現
      return Math.min(0.4, (count - this.maxUnwrappedAvatars) * 0.08 + 0.15);
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
  },

  // ==========================================================================
  // Watch: 偵聽器
  // ==========================================================================
  watch: {



    keyCodes() {
      this.handleKonamiCode();
    },

  },

  // ==========================================================================
  // Methods: 方法定義
  // ==========================================================================
  methods: {
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
        const newAdminState = !this.authority.isAdmin;
        this.$store.commit("authority", { isAdmin: newAdminState });
        this.keyCodes.length = 0;

        const statusText = newAdminState ? "🔓 管理者權限已開啟" : "🔒 管理者權限已關閉";
        this.notify(statusText, {
          title: "💡 系統隱藏指令",
          variant: newAdminState ? "success" : "secondary",
          autoHideDelay: 3000
        });
      }
    },

    visibilityChange() {
      const isVisible = !document.hidden;
      this.$store.commit("windowVisible", isVisible);
      if (isVisible && document.hasFocus()) {
        this.ipcRenderer.invoke("flash-frame", { flag: false });
      } else if (!isVisible && this.totalUnread > 0) {
        this.ipcRenderer.invoke("flash-frame", { flag: true });
      }
    },

    watchModal(e, id) {
      if (e.type === "shown") {
        this.$store.commit("lastModalId", id);
        this.clearReconnectTimer();
      } else this.resetReconnectTimer();
    },

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
    
    this.delayQueryOnlineClients = this.$utils.debounce(() => {
      if (typeof this.queryOnlineClients === 'function' && !this.showUnreadChannels.includes(this.currentChannel)) {
        this.queryOnlineClients();
      }
    }, 300);

    this.resetReconnectTimer();
    this.visibilityChange();

    this.$nextTick(async () => {
      await this.restoreSettings();
      const mapping = (await this.getCache("userMap")) || (await this.getCache("userMapping"));
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
    window.addEventListener("paste", this.onWindowPaste);
    window.addEventListener("focus", this.onWindowFocus);
    window.addEventListener("blur", this.onWindowBlur);
    document.addEventListener("visibilitychange", this.visibilityChange);
    this.$root.$on("bv::modal::shown", this.watchModal);
    this.$root.$on("bv::modal::hidden", this.watchModal);
  },

  beforeDestroy() {
    this.clearReconnectTimer();
    this.closeWebsocket();
    clearTimeout(this.checkUnreadTimer);
    window.removeEventListener("keydown", this.keydown);
    window.removeEventListener("paste", this.onWindowPaste);
    window.removeEventListener("focus", this.onWindowFocus);
    window.removeEventListener("blur", this.onWindowBlur);
    document.removeEventListener("visibilitychange", this.visibilityChange);
    this.$root.$off("bv::modal::shown", this.watchModal);
    this.$root.$off("bv::modal::hidden", this.watchModal);
  }
};
</script>

<style lang="scss" scoped>
/* 🟢 [修復] 解決放大字體時，版面高度計算不足導致與底部狀態列重疊、最後一筆被裁切的問題 */
.main-layout {
  /* 🟢 將底部留白從 2.85rem 縮減至 1.85rem，消除過大的間隔 */
  height: calc(100vh - 1.85rem); 
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 防止整個頁面出現原生滾動條 */
}
.main-card {
  flex: 1;
  min-height: 0; /* 允許 flex 子元素在空間不足時縮小，防止撐破 */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 防止卡片本身被內容撐破 */
}
/* 確保 Header 與 控制列 不會被壓縮 */
::v-deep .card-header,
::v-deep .list-group,
.flex-shrink-0 {
  flex-shrink: 0;
}
/* 強制內容區塊為 Flex 容器，並隱藏外部多餘捲動條 */
::v-deep .scrollable-board {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden !important; 
  position: relative;
}

/* 🟢 [核心修復] 擊碎內部寫死的高度的終極解法 */
/* 針對內部最後一個元素 (通常是列表清單)，強制覆寫其高度並接管滾動，徹底解決底部被裁切的問題 */
::v-deep .scrollable-board > *:last-child {
  flex: 1;
  min-height: 0;
  height: auto !important; /* 擊碎內建寫死的 calc(100vh - xxxpx) */
  max-height: none !important;
  overflow-y: auto !important; /* 確保清單本身正常滾動 */
  overflow-x: hidden !important;
}

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

/* 🟢 [修改點] 使用純 CSS 解決預覽框遮擋輸入框的問題 */
.float-preview {
  z-index: 1002;
  position: absolute;
  /* 拋棄寫死的 top: -80px 或 JS 計算，改用 bottom 100% 錨定在輸入框正上方 */
  bottom: calc(100% + 8px); 
  left: 2.5%;
  opacity: 0.92;
  border-radius: 15px;
  background-color: #6c757d; /* Bootstrap secondary 灰，搭配白字更清晰 */
  width: 95%;
  max-height: 60vh; /* 避免單張圖片過大時衝出螢幕頂端 */
  overflow-y: auto; /* 若內容過長則自動顯示捲動條 */
  box-shadow: 0px -5px 15px rgba(0,0,0,0.25); /* 補上陰影增加層次感 */
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