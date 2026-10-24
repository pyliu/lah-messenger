<template lang="pug">
.admin-manual-container.p-3.border.rounded.shadow-sm.bg-white
  .d-flex.align-items-center.justify-content-between.mb-3
    h6.font-weight-bold.text-primary.mb-0
      b-icon.mr-1(icon="shield-lock")
      span 管理者手動登入模式
    b-button(
      size="sm",
      variant="outline-secondary",
      @click="$emit('cancel')",
      title="返回一般登入"
    )
      b-icon(icon="arrow-left")
      span.ml-1 返回

  .center.d-flex.my-2(title="連線使用者資訊")
    b-input-group
      template(#prepend): b-icon.my-auto.mr-1(
        icon="person-badge",
        font-scale="2",
        variant="secondary"
      )
      b-input.mr-1(v-model="adId", placeholder="... 輸入登入帳號 ...", trim)
      b-input.mr-1(v-model="adName", placeholder="... 輸入顯示姓名 ...", trim)

  .center.d-flex.my-2
    b-input-group
      template(#prepend): b-icon.my-auto.mr-1(
        icon="building",
        font-scale="2",
        variant="secondary"
      )
      b-select(v-model="department", :options="departmentOpts", title="選擇所屬部門")

  b-input-group.my-2(title="信差伺服器資訊")
    template(#prepend): b-icon.my-auto.mr-1(
      icon="hdd-network",
      font-scale="2",
      variant="secondary"
    )
    b-input(v-model="wsHost", trim, placeholder="... 信差伺服器IP ...")
    span.my-auto.mx-1 :
    b-input(
      v-model="wsPort",
      type="number",
      min="1025",
      max="65535",
      style="max-width: 85px"
    )

  .d-flex.mt-3
    b-button.mr-2(
      @click="$emit('cancel')",
      variant="outline-secondary",
      block
    ) 取消返回
    b-button.mt-0(
      @click="emitConnectInformation",
      variant="primary",
      :disabled="!validInformation",
      block
    )
      b-icon.my-auto.mr-1(icon="box-arrow-in-right")
      span 連線登入
</template>

<script>
import trim from "lodash/trim";

export default {
  emit: ["connect", "cancel"],
  props: {
    defId: { type: String, default: '' },
    defName: { type: String, default: '' },
    defDept: { type: String, default: 'adm' }
  },
  data: () => ({
    adId: "",
    adName: "",
    wsHost: "127.0.0.1",
    wsPort: 8081,
    department: "adm",
    departmentOpts: [
      { value: "reg", text: "登記課" },
      { value: "inf", text: "資訊課" },
      { value: "adm", text: "行政課" },
      { value: "sur", text: "測量課" },
      { value: "val", text: "地價課" },
      { value: "hr", text: "人事室" },
      { value: "acc", text: "會計室" },
      { value: "supervisor", text: "主任秘書室" },
    ],
  }),
  computed: {
    validInformation() {
      if (this.empty(this.adId)) {
        return false;
      }
      if (this.empty(this.adName)) {
        return false;
      }
      if (!this.$utils.isIPv4(this.wsHost) && this.wsHost !== 'localhost') {
        return false;
      }
      const i = parseInt(trim(this.wsPort));
      if (i < 1025 || i > 65535 || isNaN(i)) {
        return false;
      }
      return true;
    },
  },
  created () {
    this.wsHost = this.apiHost || "127.0.0.1";
    this.adId = this.defId;
    this.adName = this.defName;
    this.department = this.defDept || "adm";
  },
  methods: {
    emitConnectInformation() {
      const info = {
        id: this.adId,
        name: this.adName,
        host: this.wsHost,
        port: this.wsPort,
        dept: this.department
      };
      this.$emit("connect", info);
    },
  },
};
</script>

<style lang="scss" scoped>
.admin-manual-container {
  max-width: 420px;
  margin: 0 auto;
}
</style>
