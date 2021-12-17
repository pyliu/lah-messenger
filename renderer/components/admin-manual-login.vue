<template lang="pug">
div
  .center.d-flex.my-2(title="連線使用者資訊")
    b-input-group
      template(#prepend): b-icon.my-auto.mr-1(
        icon="person-badge",
        font-scale="2.25",
        variant="secondary"
      )
      b-input.mr-1(v-model="adId", placeholder="... 輸入AD帳號 ...", trim)
      b-input.mr-1(v-model="adName", placeholder="... 輸入AD姓名 ...", trim)

  .center.d-flex.my-2
    b-input-group
      template(#prepend): b-icon.my-auto.mr-1(
        icon="building",
        font-scale="2.25",
        variant="secondary"
      )
      b-select(v-model="department", :options="departmentOpts", title="選擇所屬部門")

  b-input-group.my-2(title="信差伺服器資訊")
    template(#prepend): b-icon.my-auto.mr-1(
      icon="chat",
      font-scale="2.25",
      variant="secondary"
    )
    b-input(v-model="wsHost", trim, placeholder="... 信差伺服器IP ...")
    span.my-auto.mx-1 :
    b-input(
      v-model="wsPort",
      type="number",
      min="1025",
      max="65535",
      style="max-width: 75px"
    )

  b-button.animate__animated(
    @click="emitConnectInformation",
    variant="outline-success",
    :disabled="!validInformation",
    block
  )
    b-icon.my-auto.mr-1(icon="box-arrow-in-right", font-scale="1")
    span 連線
</template>

<script>
import trim from "lodash/trim";

export default {
  emit: ["connect"],
  data: () => ({
    adId: "",
    adName: "",
    wsHost: "220.1.34.75",
    wsPort: 8081,
    department: "supervisor",
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
      if (!this.$utils.isIPv4(this.wsHost)) {
        return false;
      }
      const i = parseInt(trim(this.wsPort));
      if (i < 1025 || i > 65535 || i === NaN) {
        return false;
      }
      return true;
    },
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
</style>
