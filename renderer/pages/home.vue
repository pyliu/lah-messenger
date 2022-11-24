<template lang="pug">
div: client-only
  transition(v-if="connected", name="list", mode="out-in"): div
    b-card.m-1(no-body, header-tag="nav", v-cloak)
      template(#header): b-nav(card-header, tabs, fill)
        b-nav-item(
          :active="isAnnouncement",
          title="全所公告訊息",
          @click="setCurrentChannel('announcement')"
        ): a.mr-1
          //- b-icon.mr-1(icon="bookmarks-fill" variant="danger")
          span.s-105 📣 公告
          b-badge.notify-announcement(
            variant="danger",
            pill,
            v-if="showUnread('announcement')"
          ) {{ getUnread('announcement') }}

        b-nav-item(
          v-for="(deptChannel, idx) in departmentChannels",
          v-if="deptChannel.value === `announcement_${userdept}`",
          :key="`ann_dept_${idx}`",
          :active="deptChannel.value === currentChannel",
          @click="setCurrentChannel(deptChannel.value)",
          :title="`${deptChannel.text} 部門公告訊息`"
        ): a.mr-1
          //- b-icon.mr-1(icon="building" variant="primary")
          span.s-105 🏛 {{ deptChannel.text }}
          b-badge.notify-dept(
            variant="info",
            pill,
            v-if="showUnread(deptChannel.value)"
          ) {{ getUnread(deptChannel.value) }}

        b-nav-item(
          :active="isPersonal",
          :title="`${userid} 個人通知訊息`",
          @click="setCurrentChannel(userid)"
        ): a.mr-1
          //- b-icon.mr-1(icon="person-square" variant="primary")
          span.s-105 📧 私訊
          b-badge.notify-personal(
            variant="success",
            pill,
            v-if="showUnread(userid)"
          ) {{ getUnread(userid) }}

        b-nav-item(
          :active="isChat",
          title="聊天室列表",
          @click="setCurrentChannel('chat')"
        ): a.mr-1
          //- b-icon.mr-1(icon="chat-dots-fill" variant="muted")
          span.s-105 💬 聊天
          b-badge.notify-chat(variant="secondary", pill, v-if="showChatUnread") {{ chatUnread }}

        b-nav-item(title="進入設定頁面"): nuxt-link(to="/settings")
          b-icon.mr-1(icon="list")

      //- chatting control bar
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

        //- show online user badges
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

      //- chatting channel board
      transition(name="list", mode="out-in"): chat-board(v-if="showChatBoard")

      //- main message display board
      transition(name="list", mode="out-in"): message-board(
        v-if="showMessageBoard",
        :list="list",
        @reply="reply"
      )

    //- 輸入訊息UI
    transition(name="listY", mode="out-in"): b-input-group.p-1(
      v-if="showInputGroup",
      size="sm",
      style="position: relative",
      @keyup.esc.exact="emoji = false"
    )
      b-textarea(
        ref="textarea",
        v-model="inputText",
        placeholder="... Ctrl + Enter 送出 ... Ctrl + V 剪貼簿貼圖 ... ESC鍵清除 ...",
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
      lah-transition(fade): .float-emoji(v-if="emoji")
        emoji-pickup(@click="addEmoji")

  //- 登入介面
  .center.vh-100(v-else, v-cloak)
    .w-75.mt-n5
      //- .center.logo: b-img#main_logo(src="taoyuan_logo.png", v-cloak, fluid)
      .center.mb-5.logo
        b-img(src="tyland.jpg", fluid, style="max-width: 96px")
        H1 桃園即時通
      .center: b-iconstack#main_logo_icon.iconstack(
        font-scale="6",
        v-cloak
      )
        b-icon(
          icon="chat-dots",
          variant="success",
          flip-h,
          shift-h="10",
          shift-v="3",
          stacked
        )
        b-icon(
          icon="chat-text",
          variant="info",
          shift-h="-10",
          shift-v="6",
          stacked
        )

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
        :def-dept="department"
        @connect="handleAdminConnect"
      )
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
          b-button.ld.ld-jump(
            v-else,
            :variant="queryADVariant",
            @click="$refs.adQueryModal.show()",
            pill
          )
            b-icon.mr-1(icon="box-arrow-right" font-scale="1.25")
            span 登入 #[b-badge(v-if="!$utils.empty(adAccount)", variant="light") {{ adAccount }}]

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
            b-input(
              v-model="adHost",
              placeholder="... AD伺服器IP ...",
              :state="validAdHost",
              trim
            )
          b-input-group.ml-1.my-1(:title="`網域帳號`")
            template(#prepend): .mr-1.my-auto 網域帳號
            b-input(
              v-model="adAccount",
              :state="validAdAccount",
              :placeholder="'👨‍💻 網域帳號'",
              trim
            )
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

  //- 狀態列
  status(:status-text="connectText")
</template>

<script>
import trim from "lodash/trim";
import debounce from "lodash/debounce";
import ImageUpload from "~/components/image-upload.vue";

export default {
  transition: "list",
  head: { title: `桃園即時通` },
  components: { ImageUpload },
  data: () => ({
    emoji: false,
    image: null,
    inputText: "",
    inputImages: [],
    connectText: "",
    adHost: "",
    adAccount: "",
    adName: "",
    adPassword: "",
    adPasswordIcon: "eye-slash",
    adPasswordType: "password",
    wsHost: "",
    wsPort: 8081,
    syncDepartmentTimer: null,
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
    departmentChannels: [
      { value: "announcement_inf", text: "資訊" },
      { value: "announcement_adm", text: "行政" },
      { value: "announcement_reg", text: "登記" },
      { value: "announcement_sur", text: "測量" },
      { value: "announcement_val", text: "地價" },
      { value: "announcement_hr", text: "人事" },
      { value: "announcement_acc", text: "會計" },
      { value: "announcement_supervisor", text: "主秘" },
    ],
    connecting: false,
    asking: false,
    reconnectMs: 20 * 1000,
    back: false,
    keyCodes: [],
    manualLogin: false,
    checkUnreadTimer: null,
    checkUreadDuration: 3 * 60 * 60 * 1000
  }),
  async fetch() {
    // restore image memento
    this.$localForage.getItem(this.imageMementoCacheKey).then((arr) => {
      this.log("回復已上傳的圖檔", `${arr?.length}筆`);
      this.$store.commit("imageMemento", arr || []);
    });
    // restore message memento
    this.$localForage.getItem(this.messageMementoCacheKey).then((arr) => {
      this.log("回復已儲存的訊息", arr);
      this.$store.commit("messageMemento", arr || []);
    });
  },
  computed: {
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
    isChat() {
      return (
        !this.currentChannel.startsWith("announcement") && !this.isPersonal
      );
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
    wsConnStr() {
      return `ws://${this.wsHost}:${this.wsPort}`;
    },
    // load user authority from API server, but need to wait apiQueryUrl updated in the mounted method
    userQueryStr() {
      return `${this.apiQueryUrl}${this.$consts.API.JSON.USER}`;
    },
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
      return this.empty(this.adPassword) || this.validAdHost === false || this.validAdAccount === false
    },
    list() {
      return this.messages[this.currentChannel] || [];
    },
    stickyChannels() {
      return [
        "announcement",
        this.adAccount,
        "chat",
        ...this.departmentChannels.map((item) => item.value),
      ];
    },
    showUnreadChannels() {
      return ["announcement", this.adAccount, `announcement_${this.department}`];
    },
    inChatting() {
      return !this.stickyChannels.includes(this.currentChannel);
    },
    showChatUnread() {
      return this.chatUnread > 0 || this.chatUnread === "99+";
    },
    chatUnread() {
      const result = Object.entries(this.unread).reduce((acc, curr) => {
        if (
          parseInt(curr[0]) > 0 ||
          [
            "lds",
            "adm",
            "sur",
            "inf",
            "reg",
            "val",
            "acc",
            "hr",
            "supervisor",
          ].includes(curr[0])
        ) {
          return acc + curr[1];
        }
        return acc;
      }, 0);
      return result > 99 ? "99+" : result;
    },
    queryADVariant() {
      if (this.empty(this.adAccount)) {
        return "primary";
      }
      if (this.empty(this.adName)) {
        return "warning";
      }
      return "success";
    },
    notifyChannels() {
      const channels = ["announcement", `announcement_${this.department}`];
      this.notifySettings.personal && channels.push(this.adAccount);
      // add chatting channel to the list
      this.notifySettings.chat && channels.push("lds");
      this.notifySettings.chat && channels.push(this.department);
      return channels;
    },
    markdImages() {
      let imgMdText = this.inputImages
        .map((base64, idx) => {
          return `![preview-${idx}](${base64})`;
        })
        .join('\n');
      if (!this.empty(this.inputText) && !this.empty(imgMdText)) {
        imgMdText = `\n***\n${imgMdText}`;
      }
      return imgMdText;
    },
    markdMessage() {
      if (this.empty(this.inputText) && this.empty(this.inputImages)) {
        return "";
      }
      // markd treat '\s{2}\n' to break line
      // return DOMPurify?.sanitize(
      //   Markd(`${this.inputText}${this.markdImages}`.replaceAll("\n", "  \n"))
      // );
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
    deptName() {
      return this.getDepartmentName(this.department)
    }
  },
  watch: {
    connectText(val) {
      this.$store.commit("statusText", val);
    },
    currentChannel(nVal, oVal) {
      this.log(`離開 ${oVal} 頻道，進入 ${nVal} 頻道`);
      // comment out to prevent mess in/out system message in chat room
      // this.delaySendChannelActivity(oVal, nVal)

      if (!(nVal in this.messages)) {
        this.$store.commit("addChannel", nVal || this.adAccount);
        this.log(this.time(), `add channel ${nVal} to $store!`);
        this.$store.commit("resetUnread", nVal || this.adAccount);
        this.log(this.time(), `add unread ${nVal} to $store!`);
      }

      // release from channel items
      this.messages[oVal] && (this.messages[oVal].length = 0);
      this.latestMessage();

      // chatting needs to query online users to show avatar
      if (!this.showUnreadChannels.includes(nVal)) {
        this.queryOnlineClients();
      }
      // clear the input UI content
      this.clear();
    },
    wsHost(val) {
      this.resetReconnectTimer();
      if (this.$utils.isIPv4(val) || this.$utils.empty(val)) {
        this.$localForage.setItem("wsHost", val);
        // api/wss/fe servers are in the same VM  by design
        this.$store.commit("apiHost", val);
      }
    },
    wsPort(val) {
      this.resetReconnectTimer();
      this.validPort && this.$localForage.setItem("wsPort", val);
    },
    userid(val) {
      this.warn('使用者ID變動', val);
      !this.empty(val) && val !== this.adAccount && (this.adAccount = val);
    },
    adHost(val) {
      this.$store.commit("ad", val);
      this.$localForage.setItem("adHost", val);
    },
    adAccount(val) {
      this.warn('使用者adAccount變動', val);
      this.$localForage.setItem("adAccount", val);
      this.$store.commit("userid", val);
    },
    adName(val) {
      this.$localForage.setItem("adName", val);
      this.$store.commit("username", val);
    },
    adPassword(val) {
      this.$store.commit("password", val);
      this.$localForage.setItem("adPassword", val);
    },
    department(val) {
      this.resetReconnectTimer();
      this.$store.commit("userdept", val);
      this.$localForage.setItem("department", val);
    },
    fetchingHistory(flag) {
      this.isBusy = flag;
    },
    inputImages(dontcare) {
      this.timeout(() => {
        if (this.$refs.floatPreview) {
          this.$refs.floatPreview.style.top =
            "-" + this.$refs.floatPreview.offsetHeight + "px";
        }
      }, 100);
    },
    inputText(dontcare) {
      this.$nextTick(() => {
        if (this.$refs.floatPreview) {
          this.$refs.floatPreview.style.top =
            "-" + this.$refs.floatPreview.offsetHeight + "px";
        }
      });
    },
    authority(val) {
      // this.warn(val);
    },
    keyCodes(arr) {
      const md5 = this.$utils.md5(this.keyCodes.join(","));
      // konami
      if (md5 === "f20b4566a1f6b848f1fbec48b2ab2c10") {
        this.$store.commit("authority", { isAdmin: !this.authority.isAdmin });
        this.$nextTick(() => {
          this.keyCodes.length = 0;
          this.authority.isAdmin &&
            this.notify("🌟 你的權限已提升為管理者 🌟", {
              type: "success",
              pos: "tf",
            });
          !this.authority.isAdmin &&
            this.notify("⚠️ 你已移除管理者權限 ⚠️", {
              type: "dark",
              pos: "tf",
            });
          this.connectText = this.authority.isAdmin ? "✔" : "⛔";
        });
      } else if (md5 === "21ea03e57ae8281916206c6710dc3e35") {
        // konami ends with 'b'
        this.$localForage.clear().then(() => {
          this.notify("⚠ 暫存資料已清除，3秒後重新整理頁面 ... ", {
            type: "warning",
            pos: "tf",
          });
          this.timeout(() => {
            this.connectText = "♻ 重新整理頁面";
            this.ipcRenderer.invoke("reload");
          }, 3000)
            .then((timeoutHandle) => {
              // handle resolved
            })
            .catch((error) => {
              this.err(error);
            });
        });
      }
    },
    manualLogin(flag) {
      if (flag) {
        this.clearReconnectTimer();
        this.reconnectMs = 20 * 1000;
      } else {
        this.resetReconnectTimer();
      }
    },
    apiUserinfo(val) {
      const deptname = val?.unit;
      let deptval = '';
      switch (deptname) {
        case '資訊課':
          deptval = 'inf';
          break;
        case '行政課':
          deptval = 'adm';
          break;
        case '登記課':
          deptval = 'reg';
          break;
        case '測量課':
          deptval = 'sur';
          break;
        case '地價課':
          deptval = 'val';
          break;
        case '人事室':
          deptval = 'hr';
          break;
        case '會計室':
          deptval = 'acc';
          break;
        default:
          deptval = 'supervisor';
      }
      this.department = deptval;
    },
    totalUnread (val) {
      this.ipcRenderer.invoke("toggleUnreadTrayIcon", {
        unread: val
      });
    }
  },
  methods: {
    delaySendChannelActivity: function noop() {},
    delayConnect() {
      /* placeholder */
    },
    delayLatestMessage() {
      /* placeholder */
    },
    clear() {
      this.inputText = "";
      this.inputImages = [];
    },
    pasted(base64) {
      !this.inputImages.includes(base64) && this.inputImages.push(base64);
    },
    removeInoutImage(base64data) {
      const index = this.inputImages.indexOf(base64data);
      if (index > -1) {
        this.inputImages.splice(index, 1);
      }
    },
    emojiPickup() {
      this.emoji = !this.emoji;
    },
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
          props: {
            to: this.currentChannel,
            modalId: "image-upload-modal",
          },
          on: {
            publish: (base64EncodedData) => {
              // received publish event from image-upload component
              this.sendImage(
                base64EncodedData,
                "上傳圖片",
                this.currentChannel
              );
            },
          },
        }),
        {
          id: "image-upload-modal",
          size: "xl",
          title: `直接傳送圖片`,
        }
      );
    },
    loadApiUserData() {
      if (this.validHost) {
        this.$axios
          .post(this.userQueryStr, {
            type: "authentication",
            ip: this.ip,
          })
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
          .catch((err) => {
            this.alert(err.toString());
          })
          .finally(() => {
            // this.log("authority", this.authority);
            // this.log("info", this.apiUserinfo);
          });
      } else {
        this.timeout(this.loadApiUserData, 400);
      }
    },
    loadUserMapData() {
      if (this.validHost) {
        // refresh user name mapping from API server
        this.$axios
          .post(this.userQueryStr, {
            type: "user_mapping",
          })
          .then(({ data }) => {
            if (this.$utils.statusCheck(data.status)) {
              this.$store.commit("userMap", data.data);
              this.setCache("userMap", data.data, this.userDataCacheDuration);
            } else {
              this.warning(data.message);
            }
          })
          .catch((err) => {
            this.alert(err.toString());
          })
          .finally(() => {});
      } else {
        this.timeout(this.loadUserMapData, 400);
      }
    },
    reply(raw) {
      const sender = this.userMap[raw["sender"]] || raw["sender"];
      const hrIdx = raw["message"]?.indexOf("<hr>");
      const text =
        hrIdx === -1 ? raw["message"] : raw["message"].substring(hrIdx + 4);
      const tmp = document.createElement("DIV");
      tmp.innerHTML = `@${sender} ${text}`;
      let innerText = tmp.textContent || tmp.innerText || "";
      if (this.$utils.length(innerText) > 20) {
        innerText = innerText.substring(0, 20) + " ... ";
      }
      this.inputText = `${innerText}\n***\n`;
      this.$nextTick(() => {
        this.$refs.textarea.$el.scrollTop = 999999;
        this.$refs.textarea?.focus();
      });
    },
    switchAdPasswordIcon() {
      if (this.adPasswordIcon === "eye") {
        this.adPasswordIcon = "eye-slash";
        this.adPasswordType = "password";
      } else {
        this.adPasswordIcon = "eye";
        this.adPasswordType = "text";
      }
    },
    sendChannelActivity(oVal, nVal) {
      if (this.connected) {
        this.log(`準備送出 ${oVal} / ${nVal} 活動訊息`);
        // delaySendChannelActivity will debounce 5000ms then checking if it need to send the message
        const oCName = this.getChannelName(oVal);
        const nCName = this.getChannelName(nVal);
        !this.stickyChannels.includes(oVal) &&
          this.currentChannel !== oVal &&
          this.sendTo(`${this.username || this.adAccount} 離開 ${oCName} 頻道`, {
            sender: "system",
            channel: oVal,
          });
        !this.stickyChannels.includes(nVal) &&
          this.currentChannel === nVal &&
          this.sendTo(`${this.username || this.adAccount} 進入 ${nCName} 頻道`, {
            sender: "system",
            channel: nVal,
          });
      }
    },
    sendAppCloseActivity() {
      const cName = this.getChannelName(this.currentChannel);
      !this.stickyChannels.includes(this.currentChannel) &&
        this.sendTo(
          `${this.username || this.adAccount} 離開 ${cName} 頻道 (程式已關閉)`,
          { sender: "system", channel: this.currentChannel }
        );
    },
    send() {
      // detect local commands
      const text = trim(this.inputText);
      if (text === "@clearCache") {
        this.$localForage.clear().then((params) => {
          this.notify(`本機記憶資料已清除`, { type: "success" });
        });
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
          const jsonStr = this.packMessage(message, {
            channel: this.currentChannel,
            ...opts,
          });
          this.websocket.send(jsonStr);
          return true;
        } else {
          this.notify(
            `伺服器連線${this.status(
              this.websocket.readyState
            )} ... 無法傳送訊息`,
            { type: "warning", pos: "tf" }
          );
        }
      }
      return false;
    },
    status(code) {
      switch (code) {
        case 0:
          return "連線中";
        case 1:
          return "已連線";
        case 2:
          return "關閉中";
        case 3:
          return "已關閉";
        default:
          return `未定義的代碼(${code})`;
      }
    },
    register() {
      if (this.connected) {
        if (this.validAdAccount && this.validAdName) {
          this.websocket.send(this.packCommand({
            command: "register",
            ip: this.ip,
            domain: this.domain,
            userid: this.adAccount,
            username: this.adName,
            dept: this.department,
            timestamp: +new Date()
          }));
          // also update IP entry to API server
          this.reportToAPIServer();
          // check unread posts
          this.checkUnread();
        } else {
          this.warning(`無法使用 ${this.adAccount} / ${this.adName} 登入即時通伺服器！`)
        }
      } else {
        this.log(this.time(), "尚未連線無法登錄客戶端資料", {
          ip: this.ip,
          domain: this.domain,
          userid: this.adAccount,
          username: this.adName,
          dept: this.department,
        });
      }
    },
    reportToAPIServer() {
      this.ipcRenderer.invoke("add-ip-entry", {
        api: `${this.apiQueryUrl}${this.$consts.API.JSON.IP}`,
        type: "add_user_ip_entry",
        note: `${this.domain} ${this.department}`,
        added_type: "DYNAMIC",
        entry_type: "USER",
        entry_id: this.adAccount,
        entry_desc: this.adName,
      });
    },
    async getChannelLastReadId(channel) {
      return (await this.getCache(`${channel}_last_id`)) || 0;
    },
    setChannelUnread(channel, unreadId) {
      this.setCache(`${channel}_last_id`, unreadId);
    },
    queryUnreadCount() {
      // sticky channels
      this.queryChannelUnreadCount("announcement");
      this.queryChannelUnreadCount(`announcement_${this.userdept}`);
      this.queryChannelUnreadCount(this.adAccount);
      // chatting channels
      this.queryChannelUnreadCount("lds");
      this.queryChannelUnreadCount(this.userdept);
    },
    async queryChannelUnreadCount(channel) {
      const lastReadId = await this.getChannelLastReadId(channel);
      const jsonString = JSON.stringify({
        type: "command",
        sender: this.adAccount,
        date: this.date(),
        time: this.time(),
        message: JSON.stringify({
          command: "unread",
          channel: channel,
          last: lastReadId,
        }),
        channel: "system",
      });
      this.websocket.send(jsonString);
    },
    queryMyChannel() {
      try {
        const jsonString = JSON.stringify({
          type: "command",
          sender: this.adAccount,
          date: this.date(),
          time: this.time(),
          message: JSON.stringify({ command: "mychannel" }),
          channel: "system",
        });
        this.websocket.send(jsonString);
        return true;
      } catch (e) {
        this.warning(`無法傳送 mychannel 命令 (${e.toString()})`);
      }
      return false;
    },
    debouncedQueryOnlineClients () { /* placeholder for debounced queryOnlineClients method */},
    async handleAckMessage(json) {
      const cmd = json?.command;
      this.log(
        this.time(),
        `處理系統 ACK 訊息 ${cmd} [home::handleAckMessage]`,
        json
      );
      switch (cmd) {
        case "register":
          json.success && this.queryUnreadCount();
          break;
        case "mychannel":
          if (json.success) {
            const payload = json.payload;
            switch (payload.action) {
              case "add":
                this.addChatChannel(payload);
                break;
              case "remove":
                this.removeChatChannel(payload);
                break;
              default:
                console.warn(`不支援的 mychannel ACK 動作 ${payload.action}`);
            }
          }
          break;
        case "remove_channel":
          const item = json.payload;
          json.success && this.$store.commit("removeParticipatedChannel", item);
          this.notify(`${json.message}`, {
            type: json.success ? "success" : "warning",
          });
          break;
        case "remove_message":
          if (json.success) {
            let found_idx = -1;
            const found = this.messages[json.payload.channel]?.find(
              (msg, idx) => {
                found_idx = idx;
                return msg.id === json.payload.id;
              }
            );
            if (found_idx > -1) {
              this.messages[json.payload.channel].splice(found_idx, 1);
            }
            // this.warn(json);
            // cascade info: { to: 'HAXXXX', id: xxxx }
            const cascade = json.payload.cascade
            // if found cacade info, also send remove message to server
            if (cascade?.to && cascade?.id) {
              const json = {
                type: "command",
                sender: this.adAccount,
                date: this.date(),
                time: this.time(),
                channel: 'system',
                message: JSON.stringify({
                  command: 'remove_message',
                  channel: cascade.to,
                  id: cascade.id,
                  // clean cascade info this time
                  cascade: ''
                })
              }
              this.websocket.send(JSON.stringify(json));
            }
            // this.notify(`移除訊息成功 (#${json.payload.id})`, { type: 'success' })
          } else {
            this.err(json);
            this.alert(`${json.message}`);
          }
          this.connectText = `${json.message}`;
          break;
        case "edit_message":
          if (json.success) {
            // this.warn(json)
            // channel data store in first level payload
            const channel = json.payload.channel
            // the real payload is in 2 levels down
            const payload = json.payload.payload
            const found = this.messages[channel]?.find(msg => msg.id === payload.id);
            // this.warn(channel, found, payload, json)
            if (found) {
              const isAnnouncement = channel.startsWith('announcement')
              if (isAnnouncement) {
                found.message = { ...payload }
              } else {
                const cascade = json.payload.cascade
                found.message = payload.message
                // if found cacade info, also send edit message to server
                // cascade info: { to: 'HAXXXX', id: xxxx }
                const cascadeId = cascade?.id
                const cascadeChannel = cascade?.to
                if (cascadeId && cascadeChannel) {
                  // remove cascade data
                  delete json.payload.cascade
                  this.websocket?.send(
                    JSON.stringify({
                      type: "command",
                      sender: this.userid,
                      date: this.date(),
                      time: this.time(),
                      message: {
                        command: 'edit_message',
                        channel: cascadeChannel,
                        id: cascadeId,
                        sender: this.userid,
                        payload: {
                          ...payload,
                          id: cascadeId,
                          channel: cascadeChannel,
                          sender: this.userid,
                          // clean cascade data in title field
                          title: 'dontcare',
                          // remove reply header
                          message: payload.message.replaceAll(this.regexpReplyHeader, '')
                        }
                      },
                      channel: 'system'
                    })
                  );
                }
              }
            }
          } else {
            this.err(json);
            this.alert(`${json.message}`);
          }
          this.connectText = `${json.message}`;
          break;
        case "previous":
          this.$store.commit("fetchingHistory", false);
          !json.success &&
            this.notify(json.message, {
              subtitle: this.getChannelName(json.payload.channel),
              type: "info",
            });
          this.connectText = `${json.message}(${json.payload.count}筆)`;
          break;
        case "unread":
          this.$store.commit("setUnread", {
            channel: json.payload.channel,
            count: json.payload.unread,
          });
          this.connectText = `${json.message}`;
          break;
        case "online":
          // remove empty value from array
          this.$store.commit("connectedUsers", json.payload.users.filter(n => n));
          this.connectText = `${json.message}`;
          break;
        case "private_message":
          const insertedId = json.payload.insertedId;
          const insertedChannel = json.payload.channel;
          if (
            insertedChannel !== this.adAccount &&
            !insertedChannel?.startsWith("announcement") &&
            !this.chatRooms.includes(insertedChannel)
          ) {
            const remove = JSON.stringify({
              to: insertedChannel,
              id: insertedId,
            });
            // add sent message to my channel
            this.websocket.send(
              this.packMessage(json.payload.message, {
                channel: this.adAccount,
                title: remove, // use title field to store inserted info for now
                priority: 4,
                flag: 1, // now use flag === 1 to indicate the message is a pm sent by myself
              })
            );
          }

          this.connectText = `${json.message}`;
          break;
        case "set_read":
          const list = this.messages[json.payload.channel];
          if (Array.isArray(list)) {
            const found = list.find(
              (message) => message?.id === json.payload.id
            );
            if (found && (found.flag & 2) !== 2) {
              found.flag += 2;
            }
          }
          if (json.cascade) {
            this.warn("訊息設定已讀", "連帶更新", json.cascade);
            // to set read for the cascade message in my channel
            const myList = this.messages[this.adAccount];
            if (Array.isArray(myList)) {
              const found = myList.find((message) => {
                const removeJson = JSON.parse(message.remove || message.title);
                return (
                  removeJson?.to === json.payload.channel &&
                  parseInt(removeJson?.id) === parseInt(json.payload.id)
                );
              });
              if (found) {
                const json = {
                  type: "command",
                  sender: this.adAccount,
                  date: this.date(),
                  time: this.time(),
                  channel: "system",
                };
                json.message = {
                  command: "set_read",
                  channel: found.channel,
                  id: found.id,
                  flag: found.flag,
                  sender: this.adAccount,
                  cascade: false, // stop cascading, since this is the stop point
                };
                this.websocket.send(JSON.stringify(json));
              }
            }
          }
          break;
        case "check_read":
          if (Array.isArray(this.messages[json.payload.sender])) {
            const found = this.messages[json.payload.sender].find(
              (message) => message?.id === json.payload.senderChannelMessageId
            );
            if (found && (found.flag & 2) !== 2) {
              // will set read at server side when detected the message is read
              // const json = {
              //   type: "command",
              //   sender: this.adAccount,
              //   date: this.date(),
              //   time: this.time(),
              //   channel: 'system'
              // }
              // json.message = {
              //   command: 'set_read',
              //   channel: found.channel,
              //   id: found.id,
              //   flag: found.flag,
              //   sender: this.adAccount,
              //   cascade: false // stop cascading, since this is the stop point
              // }
              // this.websocket.send(JSON.stringify(json))
              found.flag += 2;
            }
          }
          break;
        default:
          console.warn(`收到未支援指令 ${cmd} ACK`, json);
      }
    },
    addChatChannel(payload) {
      this.$store.commit("addParticipatedChannel", {
        id: payload.id,
        name: payload.name,
        participants: payload.participants,
        type: payload.type, // 0 => 1-1, 1 => group, 2 => dept
      });
    },
    removeChatChannel(payload) {
      this.$store.commit("removeParticipatedChannel", {
        id: payload.id,
        name: payload.name,
        participants: payload.participants,
        type: payload.type,
      });
    },
    async handleSystemMessage(json) {
      const cmd = json.command;
      const payload = json.payload
      this.log(
        this.time(),
        `處理系統訊息 ${cmd} [home::handleSystemMessage]`,
        json
      );
      switch (cmd) {
        case "update_user":
          if (typeof payload === 'object' && payload.id && payload.name && payload.dept) {
            await this.$localForage.setItem("adAccount", payload.id);
            await this.$localForage.setItem("adName", payload.name);
            await this.$localForage.setItem("department", payload.dept);  // refresh cached userinfo
            this.refreshApiDepartment(payload.dept);
            const userinfo = await this.$localForage.getItem("userinfo");
            /**
             * const userinfo = {
                userid: 'HAXXXXXXX',
                user: {user: 'HAXXXXXXXX', ...},
                ...
              }
              */
            await this.$localForage.setItem("userinfo", {
              ...userinfo,
              userid: payload.id,
              user: {
                ...userinfo.user,
                user: payload.id
              }
            });
            this.connectText = "♻ 登入資訊更新，重新整理頁面";
            this.ipcRenderer.invoke("reload");
          } else {
            this.warn("update_user 指令帶入之json物件參數(json.message)有誤", json);
          }
          break;
        case "user_connected":
          /* connectedUsers item schema
            { 
              command: "register"
              dept: "inf"
              domain: ""
              ip: "192.168.88.51"
              timestamp: 1654683589828
              userid: "HA10013859"
              username: "測試中"
            }
           */
          this.connectText = json.message;
          const found = this.connectedUsers.find(user => user.userid === payload.userid)
          !found && this.connectedUsers.push(payload);
          break;
        case "user_disconnected":
          this.connectText = json.message;
          let foundIdx = -1;
          this.connectedUsers.find((user, idx) => {
            const found = user.userid === payload.userid
            if (found) {
              foundIdx = idx
            }
            return found
          })
          if (foundIdx > -1) {
            this.connectedUsers.splice(foundIdx, 1)
          }
          // this.$utils.remove(this.connectedUsers, { userid: payload.userid });
          break;
        default:
          this.log(this.time(), `未支援的命令 ${cmd}`, json);
      }
    },
    handleAdminConnect(info) {
      this.wsHost = info.host;
      this.wsPort = info.port;
      // this.$store.commit("userid", info.id);
      this.adAccount = info.id;
      this.adName = info.name;
      this.department = info.dept;
      this.manualLogin = false;
      this.resetReconnectTimer();
      this.connect();
    },
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
            // ws to Vuex store
            this.$store.commit("websocket", ws);
            this.log(this.time(), "已連線", e);
            // set client info to remote ws server
            this.register();

            // query current channel latest messages
            this.list.length = 0;
            this.delayLatestMessage();

            this.connectText = "已上線";
            this.connecting = false;
          };
          ws.onclose = (e) => {
            this.$store.commit("websocket", undefined);
            this.$config.isDev &&
              console.warn(this.time(), "WS伺服器連線已關閉", e);
            this.connectText = `等待重新連線中(${this.wsConnStr})`;
            this.connecting = false;
          };
          ws.onerror = (e) => {
            this.$store.commit("websocket", undefined);
            this.$config.isDev &&
              console.warn(this.time(), "WS伺服器連線出錯", e);
            this.connectText = `'WS伺服器連線出錯'`;
            this.alert(`WS伺服器連線有問題`, {
              pos: "tf",
              subtitle: this.wsConnStr,
            });
            this.connecting = false;
          };
          ws.onmessage = async (e) => {
            const incoming = JSON.parse(e.data);
            const channel = incoming.channel;

            const receivedId = incoming.message.id || incoming.id;
            const lastReadId =
              (await this.getChannelLastReadId(channel)) || 0;

            this.log(
              `現在頻道 ${channel}`,
              `收到ID ${receivedId}`,
              `最後讀取ID ${lastReadId}`,
              incoming
            );

            this.connectText = `收到 ${this.getChannelName(channel)} 訊息`;
            this.log(
              this.time(),
              `現在 ${this.currentChannel} 頻道收到 ${channel} 頻道的 #${incoming["id"]} 資料`,
              incoming
            );

            if (incoming.type === "ack") {
              this.handleAckMessage(incoming.message);
            } else if (channel === "system") {
              // got system message
              this.handleSystemMessage(incoming.message);
            } else if (this.currentChannel === channel) {
              // add empty array if store does not have it
              !Array.isArray(this.messages[channel]) &&
                this.$store.commit("addChannel", channel);
              this.$nextTick(() => {
                // add message to store channel list
                if (!this.$utils.empty(incoming.message)) {
                  if (incoming.prepend) {
                    this.messages[channel].unshift(incoming);
                  } else {
                    // prevent to add duplicated message
                    const found = this.messages[channel].find((msg, idx) => {
                      return msg.id === incoming.id;
                    });
                    if (!found) {
                      this.messages[channel].push(incoming);
                      // only recieved id is greater than read id that needs to insert to current message list
                      if (receivedId > lastReadId) {
                        // store the read id for this channel at FE
                        this.setChannelUnread(channel, receivedId);
                      }
                      this.triggerNotification(incoming);
                    }
                  }
                }
              });
            } else if (incoming.message && incoming.sender !== "system") {
              // add unread stats
              if (parseInt(this.unread[channel]) === NaN) {
                this.resetUnread(channel);
              }
              // channel got new message then pluses the counter
              if (receivedId > lastReadId) {
                // only concerned channel needs to increase counter
                if (this.currentChannel !== channel && ['lds', 'announcement', `announcement_${this.userdept}`, this.userid, this.userdept].includes(channel)) {
                  this.plusUnread(channel);
                }
              }
              this.triggerNotification(incoming);
            }

            this.connecting = false;
          };
        } catch (e) {
          this.connectText = "連線錯誤";
          console.error(e);
          this.closeWebsocket();
        } finally {
          // delay to reset the back flag (control login panel)
          this.timeout(() => (this.back = false), 1000);
        }
      } else {
        // try to get user info from api server
        const IDReady = !this.$utils.empty(this.adAccount);
        this.connectText = '請先登入系統';
        if (this.reconnectMs < 640 * 1000) {
          this.reconnectMs *= 2;
          this.resetReconnectTimer();
        }
        // send notification to user to login
        this.ipcRenderer.invoke('notification', {
          message: "請登入即時通以讀取最新訊息！",
          showMainWindow: false
        });
      }
    },
    latestMessage() {
      const channel = this.currentChannel;
      if (this.connected) {
        const jsonString = JSON.stringify({
          type: "command",
          sender: this.adAccount,
          date: this.date(),
          time: this.time(),
          message: JSON.stringify({
            command: "latest",
            channel: channel,
            count: 10,
          }),
          channel: "system",
        });
        this.websocket.send(jsonString);
      } else {
        this.log(this.time(), `尚未連線無法取得 ${channel} 最新訊息資料`);
      }
    },
    resetReconnectTimer() {
      // reset timer if it already settled
      this.clearReconnectTimer();
      // in home.vue, checks connection every 20s (default)
      if (this.timer === null && this.$route.name === "home") {
        this.log(
          this.time(),
          "啟動重新連線檢查定時器",
          this.reconnectMs / 1000,
          "secs"
        );
        this.$store.commit(
          "timer",
          setInterval(() => {
            this.log(this.time(), "檢查連線狀態 ... ");
            this.connectText = "檢查連線狀態";
            this.connect();
          }, this.reconnectMs)
        );
      }
    },
    invokeADQuery() {
      if (this.asking === true) {
        this.connectText = `AD查詢中`;
        return;
      }
      if (
        this.empty(this.adPassword) ||
        this.validAdAccount === false ||
        this.validAdHost === false
      ) {
        this.connectText = `缺漏必要欄位無法查詢`;
        return;
      }
      // hide modal window
      this.$refs.adQueryModal.hide();
      this.adName = this.userMap[this.adAccount] || this.adAccount;
      this.asking = true;
      this.log(this.time(), `透過AD查詢使用者資訊`);
      const sAMAccountName = `${this.adAccount}@${this.domain}`;
      this.ipcRenderer
        .invoke("ad-user-query", {
          url: `ldap://${this.adHost}`,
          baseDN: `DC=${this.domain.split(".").join(",DC=")}`, // 'DC=PCNAME,DC=HA,DC=CENWEB,DC=LAND,DC=MOI'
          username: sAMAccountName,
          password: this.adPassword,
        })
        .then((result) => {
          const group = result.group;
          const desc = result.description;
          this.log(this.time(), `查到 ${sAMAccountName} 描述`, desc);
          this.log(this.time(), `查到 ${sAMAccountName} 部門`, group);
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
          this.alert(`查詢 ${sAMAccountName} 帳號失敗，密碼錯誤!?`, {
            title: `ldap://${this.adHost}`
          });
        })
        .finally(() => {
          this.log(this.time(), `透過AD查詢使用者中文姓名結束`);
          this.asking = false;
        });
    },
    queryUserInfo() {
      // dynamic get userinfo from main process
      this.$localForage.getItem("userinfo").then((userinfo) => {
        if (userinfo) {
          this.setUserInfo(userinfo);
        } else {
          this.ipcRenderer.invoke("userinfo").then((userinfo) => {
            this.setUserInfo(userinfo);
          });
        }
      });
    },
    async setUserInfo(userinfo) {
      // if userid is empty, uses adAccount instead
      if (this.empty(userinfo?.userid)) {
        userinfo.userid = this.adAccount;
      }
      this.$store.commit("userinfo", userinfo);
      this.$localForage.setItem("userinfo", userinfo);
      if (!this.$utils.isIPv4(this.adHost)) {
        this.adHost = this.getFirstDNSIp();
      }
      const cached = await this.$localForage.getItem("adName");
      const parts = [];
      if (this.ip.startsWith('192.168.') || this.ip.startsWith('220.1.')) {
        parts.push(this.ip);
      }
      !this.empty(this.adAccount) && parts.push(this.adAccount);
      if (this.adAccount !== cached && !this.empty(cached)) {
        parts.push(cached);
      }
      parts.push(this.pcname);
      this.ipcRenderer.invoke("title", parts.join(' / '));
      this.register();
      // inject userinfo to electron mainWindow as well
      this.ipcRenderer.invoke("injectUserinfo", {
        ...userinfo,
        userdept: this.userdept,
      });
    },
    ipcRendererSetup() {
      const { ipcRenderer } = require("electron");
      this.ipcRenderer = ipcRenderer;
      // remvoe main process all listeners
      this.ipcRenderer.removeAllListeners("quit");
      this.ipcRenderer.removeAllListeners("set-current-channel");
      // register main process quit event listener (To send leave channel message after user closed the app)
      this.ipcRenderer.on("quit", (event, args) => this.sendAppCloseActivity());
      // register main process set-current-channel event listener (To switch tab after notification showing up)
      this.ipcRenderer.on("set-current-channel", (event, channel) => {
        this.setCurrentChannel(channel);
      });
      this.ipcRenderer.on("in-browser-notify", (event, payload) => {
        this.notify(payload.message, {
          type: payload.type || 'info',
          title: payload.title || '📢 通知'
        })
      });
    },
    async triggerNotification(incoming) {
      const channel = incoming.channel;
      const receivedId = incoming.message.id || incoming.id;
      const lastReadId = (await this.getChannelLastReadId(channel)) || 0;
      if (receivedId > lastReadId) {
        // tell electron window the channels got unread message
        this.ipcRenderer.invoke("unread", channel);
        // determining wether the message should trigger the system notification or not
        this.invokeNotification(incoming);
      }
    },
    async invokeNotification(incoming) {
      const channel = incoming.channel;
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
      // remove all html tags (will generate by Markd)
      const temp = document.createElement("div");
      temp.innerHTML = incoming.message.title || incoming.message;
      const title = temp.innerText.substring(0, 18) + " ... ";

      this.warn(
        `呼叫主程序發出通知 SENDER: ${incoming.sender} MY ID: ${this.adAccount}`,
        title
      );
      // store the last read id
      this.setCache(`${channel}_last_id`, incoming.message.id || incoming.id);
      // const showMainWindow = this.notifyChannels.includes(channel);
      // sender not self and settings allowed then triggers notification
      if (incoming.sender !== this.adAccount) {
        this.ipcRenderer.invoke('notification', {
          message: title,
          showMainWindow: false
        });
      }
    },
    keydown(event) {
      if (event.defaultPrevented) {
        return; // Should do nothing if the default action has been cancelled
      }
      const key = event.keyCode;
      switch (key) {
        case 37:
          this.connectText = "←";
          break;
        case 38:
          this.connectText = "↑";
          break;
        case 39:
          this.connectText = "→";
          break;
        case 40:
          this.connectText = "↓";
          break;
        case 65:
          this.connectText = "a";
          break;
        case 66:
          this.connectText = "b";
          break;
        default:
          this.connectText = "🔑";
          this.keyCodes.length = 0;
      }
      this.keyCodes.push(key);
      this.keyCodes.length > 10 && this.keyCodes.shift();
    },
    visibilityChange(event) {
      this.$store.commit("windowVisible", !document.hidden);
    },
    watchModal(bvEvent, modalId) {
      const type = bvEvent?.type
      if (type === 'shown') {
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
        this.log(
          this.time(),
          `add channel ${this.currentChannel} to $store! [messageMixin::created]`
        );
        this.$store.commit("resetUnread", this.currentChannel);
        this.log(
          this.time(),
          `add unread ${this.currentChannel} to $store! [messageMixin::created]`
        );
      }
    },
    async checkDefaultSvrIp() {
      this.wsHost = await this.$localForage.getItem("wsHost");
      if (this.$utils.empty(this.wsHost)) {
        if (this.$utils.empty(this.defaultSvrIp)) {
          this.timeout(this.checkDefaultSvrIp, 400);
        } else {
          this.wsHost = this.defaultSvrIp
        }
      }
    },
    refreshApiDepartment(val) {
      if (!this.$utils.empty(val)) {
        const deptname = this.getDepartmentName(val);
        this.$store.commit('apiUserinfo', { unit: deptname });
        this.setCache("apiUserinfo", this.apiUserinfo, this.userDataCacheDuration);
        // sync to API server
        this.ipcRenderer.invoke("change-user-dept", {
          api: `${this.apiQueryUrl}${this.$consts.API.JSON.USER}`,
          type: "upd_dept",
          id: this.userid,
          dept: deptname
        })
      }
    },
    async syncApiDepartment() {
      if (!this.$utils.empty(this.apiUserinfo)) {
        const apiDeptName = this.apiUserinfo?.unit;
        if (this.deptName !== apiDeptName) {
          this.warning(`您的部門(${this.deptName})已修正為${apiDeptName}，如欲變更請洽管理者至「智慧控管系統」「員工管理」頁面進行修改。`);
          let deptval = '';
          switch (apiDeptName) {
            case '資訊課':
              deptval = 'inf';
              break;
            case '行政課':
              deptval = 'adm';
              break;
            case '登記課':
              deptval = 'reg';
              break;
            case '測量課':
              deptval = 'sur';
              break;
            case '地價課':
              deptval = 'val';
              break;
            case '人事室':
              deptval = 'hr';
              break;
            case '會計室':
              deptval = 'acc';
              break;
            default:
              deptval = 'supervisor';
          }
          this.department = deptval;
        } else {
          this.log(this.time(), '無須同步部門資訊');
        }
      }
    },
    async restoreSettings() {
      this.adAccount = await this.$localForage.getItem("adAccount");
      this.adName = await this.$localForage.getItem("adName");
      this.adPassword = await this.$localForage.getItem("adPassword");
      this.department = await this.$localForage.getItem("department");
      this.adHost = await this.$localForage.getItem("adHost");
      this.wsHost = await this.$localForage.getItem("wsHost");
      this.wsPort = await this.$localForage.getItem("wsPort") || 8081;
      // restore effect setting to store
      this.$store.commit("effect", await this.$localForage.getItem("effect"));
      // restore history count to store
      this.$store.commit(
        "history",
        (await this.$localForage.getItem("history")) || 10
      );
      this.$store.commit("fetchingHistory", false);
      this.$store.commit("apiHost", this.wsHost);
      this.$store.commit("apiPort", parseInt(await this.$localForage.getItem("apiPort")) || 80);
      this.$store.commit("fePort", parseInt(await this.$localForage.getItem("fePort")) || 8080);
      this.$store.commit("resetUnread", this.adAccount);
      this.$store.commit("notifySettings", {
        ...this.notifySettings,
        ...(await this.$localForage.getItem("notifySettings")),
      });
    },
    getDepartmentName(val) {
      switch (val) {
        case 'inf':
          return '資訊課'
        case 'adm':
          return '行政課'
        case 'reg':
          return '登記課'
        case 'sur':
          return '測量課'
        case 'val':
          return '地價課'
        case 'hr':
          return '人事室'
        case 'acc':
          return '會計室'
        case 'supervisor':
          return '主任祕書室'
        default:
          return '未知部門'
      }
    },
    checkUnread() {
      clearTimeout(this.checkUnreadTimer);
      if (this.totalUnread > 0) {
        const message = `您有 ${this.totalUnread} 個未讀訊息!`;
        this.ipcRenderer.invoke('notification', {
          message: message,
          showMainWindow: false
        });
        this.warn(message, this.unread);
      } else {
        // only concerned messages will calculate into total counter (in $store)
        // reset others just in case
        this.$store.commit('resetUnreadAll');
      }
      // check every 10min
      this.timeout(this.checkUnread, this.$config.isDev ? 30 * 1000 : this.checkUreadDuration).then(handler => {
        this.checkUnreadTimer = handler;
      });
    }
  },
  created() {
    this.addCurrentChannel();
    this.ipcRendererSetup();
    this.queryUserInfo();
  },
  mounted() {
    this.delayConnect = debounce(this.connect, 1500);
    this.delayLatestMessage = debounce(this.latestMessage, 400);
    this.delaySendChannelActivity = debounce(
      this.sendChannelActivity,
      0.5 * 1000
    );

    // start reconnect timer
    this.resetReconnectTimer();

    this.$nextTick(async () => {
      this.restoreSettings();
      // restore usermap
      const mapping = await this.getCache("userMapping");
      if (mapping === false) {
        this.loadUserMapData();
      } else {
        this.$store.commit("userMap", mapping);
      }
      // checking api server for the user authority
      const authority = await this.getCache("userAuthority");
      const apiUserinfo = await this.getCache("apiUserinfo");
      if (authority === false || apiUserinfo === false) {
        this.loadApiUserData();
      } else {
        this.$store.commit("authority", authority);
        this.$store.commit("apiUserinfo", apiUserinfo);
      }
      this.checkDefaultSvrIp();
      // tell main process the renderer phase is ready
      this.ipcRenderer.invoke("home-ready");
    });
    window.addEventListener("keydown", this.keydown);
    document.addEventListener("visibilitychange", this.visibilityChange);
    this.$store.commit("windowVisible", !document.hidden);
    this.$root.$on('bv::modal::shown', this.watchModal);
    this.$root.$on('bv::modal::hidden', this.watchModal);
    // for querying online users
    this.debouncedQueryOnlineClients = this.$utils.debounce(this.queryOnlineClients, 1000)
    
  },
  beforeDestroy() {
    // remove timer if user is going to leave the page
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
.color-primary {
  color: #007bff;
}
.logo {
  animation: fadeInDown; /* referring directly to the animation's @keyframe declaration */
  animation-duration: 2000ms; /* don't forget to set a duration! */
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
  left: 80px;
}
.notify-dept {
  @include notify();
  left: 180px;
}
.notify-personal {
  @include notify();
  left: 275px;
}
.notify-chat {
  @include notify();
  left: 380px;
}
.nav-link:hover .badge {
  opacity: 1;
}
</style>
