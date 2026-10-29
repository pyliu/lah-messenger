<template lang="pug">
.center.vh-100(v-cloak)
  .w-100.d-flex.flex-column.align-items-center.justify-content-center.px-3
    //- 管理員手動登入模式
    lah-transition(fade)
      admin-manual-login(
        v-if="manualLogin",
        :def-id="adAccount",
        :def-name="adName",
        :def-dept="department",
        @connect="onAdminConnect",
        @cancel="onCancelManual"
      )

      //- 一般同仁智慧登入卡片
      .login-card.p-4.border.rounded.shadow.bg-white(v-else)
        //- 卡片頂部功能列：Logo + 標題 + 管理者入口
        .d-flex.align-items-center.justify-content-between.mb-3
          .d-flex.align-items-center(@click="handleLogoClick", style="cursor: pointer;", title="桃園即時通 (連點5次開啟管理模式)")
            b-img(src="tyland.jpg", fluid, style="width: 32px; height: 32px;", class="mr-2")
            h5.font-weight-bold.mb-0.text-dark 桃園即時通
          b-button(
            size="sm",
            variant="outline-secondary",
            @click="handleTriggerAdminLogin",
            title="管理者手動模式",
            class="border-0 px-2"
          )
            b-icon(icon="shield-lock", font-scale="1.2", :variant="isAdmin ? 'success' : 'secondary'")

        //- 身分呈現中央區
        .text-center.my-3
          .avatar-wrapper.mb-2
            b-avatar(
              size="4.5rem",
              variant="primary",
              :text="avatarText",
              class="shadow-sm font-weight-bold"
            )
          h3.font-weight-bold.text-dark.mb-1 {{ adName || '使用者' }}
          .text-muted.small.mb-2
            b-icon.mr-1(icon="person-badge")
            span {{ adAccount || '未登入公務帳號' }}

          //- 帳號非正式警示或提示
          .alert.alert-warning.py-2.px-3.my-2.small.text-left(v-if="!validAdAccount && !empty(adAccount)")
            b-icon.mr-1(icon="exclamation-triangle-fill", variant="warning")
            span 非正式公務帳號 (需為八所 H[A-H] 格式)
          .alert.alert-secondary.py-2.px-3.my-2.small.text-left(v-else-if="empty(adAccount)")
            b-icon.mr-1(icon="info-circle-fill", variant="secondary")
            span 未偵測到 Windows 公務帳號，請以公務身分登入

          //- 部門鎖定標籤 (防呆、不可亂選)
          .my-2
            b-badge.px-3.py-2.font-weight-normal(
              variant="info",
              style="font-size: 0.95rem; letter-spacing: 1px;",
              v-b-tooltip.hover="'所屬課室由系統自動判定（鎖定保護）'"
            )
              b-icon.mr-1(icon="building")
              span {{ deptName }}
              b-icon.ml-2(icon="lock-fill", font-scale="0.85")

        //- 伺服器狀態微縮標籤 (純狀態顯示、不干擾視覺)
        .text-center.my-3
          span.badge.badge-light.border.text-secondary.px-2.py-1(style="font-size: 0.8rem")
            b-icon.mr-1(icon="hdd-network", :variant="validHost ? 'success' : 'warning'")
            span 伺服器 {{ wsHost || '127.0.0.1' }}:{{ wsPort || '8081' }}

        //- 候選伺服器全數斷線警告與手動設定入口
        .alert.alert-danger.py-2.px-3.my-2.small.text-left(v-if="allCandidatesFailed")
          .d-flex.align-items-center.justify-content-between
            div
              b-icon.mr-1(icon="exclamation-octagon-fill", variant="danger")
              span.font-weight-bold 無法連線伺服器
              span.text-muted.ml-1(v-if="candidateIpsStr") (已嘗試 {{ candidateIpsStr }})
            b-button(
              size="sm",
              variant="danger",
              @click="openManualServerModal",
              class="ml-2 py-0 px-2 font-weight-bold"
            ) 手動設定

        //- 主要操作按鈕
        .mt-4
          b-button(
            v-if="connecting",
            variant="primary",
            disabled,
            block,
            pill,
            size="lg"
          )
            b-spinner(small, class="mr-2")
            span 連線登入中...
          b-button(
            v-else,
            variant="primary",
            :disabled="!validInformation",
            @click="$emit('enter')",
            block,
            pill,
            size="lg",
            class="shadow-sm font-weight-bold"
          )
            b-icon(icon="box-arrow-in-right", class="mr-1")
            span 進入即時通

    //- 管理員通行碼輸入 Modal
    b-modal#admin-auth-modal(
      title="管理者身分認證",
      centered,
      hide-footer,
      @shown="$refs.adminPwdInput && $refs.adminPwdInput.focus()"
    )
      b-form(@submit.prevent="confirmAdminAuth")
        b-form-group(label="請輸入管理者通行碼：", label-for="admin-pwd")
          b-form-input#admin-pwd(
            ref="adminPwdInput",
            type="password",
            v-model="adminPasswordInput",
            placeholder="請輸入通行碼...",
            required
          )
        .d-flex.justify-content-end.mt-3
          b-button.mr-2(variant="secondary", @click="$bvModal.hide('admin-auth-modal')") 取消
          b-button(variant="primary", type="submit") 驗證進入
</template>

<script>
import AdminManualLogin from '~/components/admin-manual-login.vue'

export default {
  name: 'HomeLogin',
  components: {
    AdminManualLogin
  },
  props: {
    manualLogin: { type: Boolean, default: false },
    adAccount: { type: String, default: '' },
    adName: { type: String, default: '' },
    department: { type: String, default: '' },
    deptName: { type: String, default: '未知課室' },
    avatarText: { type: String, default: '?' },
    validHost: { type: Boolean, default: false },
    wsHost: { type: String, default: '' },
    wsPort: { type: [String, Number], default: 8081 },
    connecting: { type: Boolean, default: false },
    validInformation: { type: Boolean, default: false },
    validAdAccount: { type: Boolean, default: false },
    allCandidatesFailed: { type: Boolean, default: false },
    candidateIps: { type: Array, default: () => [] },
    isAdmin: { type: Boolean, default: false }
  },
  data: () => ({
    adminPasswordInput: '',
    logoClickCount: 0,
    showManualServerModal: false,
    customWsHost: '',
    customWsPort: 8081
  }),
  computed: {
    candidateIpsStr () {
      return (this.candidateIps || []).join(', ')
    }
  },
  methods: {
    onAdminConnect (info) {
      this.$emit('admin-connect', info)
    },
    onCancelManual () {
      this.$emit('update:manualLogin', false)
    },
    handleTriggerAdminLogin () {
      if (this.isAdmin) {
        this.$emit('update:manualLogin', true)
      } else {
        this.adminPasswordInput = ''
        this.$bvModal.show('admin-auth-modal')
      }
    },
    confirmAdminAuth () {
      if (this.adminPasswordInput === '033695588') {
        this.$store.commit('authority', { isAdmin: true })
        this.$bvModal.hide('admin-auth-modal')
        this.$emit('update:manualLogin', true)
        this.notify('已通過管理員身分認證', { variant: 'success', title: '管理者登入' })
      } else {
        this.alert('通行碼錯誤，無法進入管理員模式！', { variant: 'danger' })
      }
    },
    openManualServerModal () {
      this.customWsHost = this.wsHost || '220.1.34.18'
      this.customWsPort = this.wsPort || 8081
      this.showManualServerModal = true
    },
    handleSaveManualServer () {
      if (this.empty(this.customWsHost)) {
        this.alert('請輸入有效的伺服器 IP 或網域名稱', { variant: 'warning' })
        return
      }
      this.$emit('save-server', { host: this.customWsHost, port: this.customWsPort })
    },
    handleLogoClick () {
      this.logoClickCount = (this.logoClickCount || 0) + 1
      if (this.logoClickCount >= 5) {
        this.logoClickCount = 0
        this.$store.commit('authority', { isAdmin: true })
        this.$emit('update:manualLogin', true)
        this.notify('🔓 已觸發管理員模式', { variant: 'success', title: '隱藏彩蛋' })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.login-card {
  width: 100%;
  max-width: 380px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
</style>
