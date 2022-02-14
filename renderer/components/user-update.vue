<template lang="pug">
div
  .center.d-flex.my-2(title="連線使用者資訊")
    b-input-group(prepend="帳號")
      b-input.mr-1(v-model="adId", placeholder="... 輸入AD帳號 ...", trim, title="輸入AD帳號")
      b-input.mr-1(v-model="adName", placeholder="... 輸入AD姓名 ...", trim, title="輸入AD姓名")

  .center.d-flex.my-2
    b-input-group(prepend="部門")
      b-select.mr-1(v-model="department", :options="departmentOpts", title="選擇部門")

  .center.d-flex.my-2
    b-input-group(prepend="電腦")
      b-input.mr-1(v-model="uIp", :state="$utils.isIPv4(uIp)", placeholder="... 輸入電腦IP ...", trim, readonly, title="輸入電腦IP")
  
  .center.d-flex.my-2
    b-input-group(prepend="分機")
      b-input.mr-1(v-model="ext", placeholder="... 輸入分機號碼 ...", trim, readonly, title="輸入分機號碼")

  .center.d-flex.my-2
    b-input-group(prepend="工作")
      b-input.mr-1(v-model="work", placeholder="... 輸入工作描述 ...", trim, readonly, title="輸入工作描述")

  b-button.animate__animated(
    variant="outline-success",
    :disabled="!validInformation",
    @click="modify"
    block
  )
    b-icon.my-auto.mr-1(icon="pencil-square", font-scale="1")
    span 更新
</template>

<script>
export default {
  emit: ['update'],
  name: 'UserUpdate',
  props: {
    userData: { type: Object, required: true }
  },
  data: () => ({
    adId: "",
    adName: "",
    ext: '',
    uIp: '',
    work: '',
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
    ]
  }),
  async fetch () {
  },
  computed: {
    validInformation() {
      if (this.empty(this.adId)) {
        return false;
      }
      if (this.empty(this.adName)) {
        return false;
      }
      if (!this.$utils.isIPv4(this.uIp)) {
        return false
      }
      if (!this.empty(this.ext) && parseInt(this.ext) <= 0) {
        return false
      }
      return true;
    },
    unit() {
      const found = this.departmentOpts.find((item) => {
        return item.text === this.userData?.unit
      })
      return found ? found.value : 'adm'
    }
  },
  async created () {
    this.adId = await this.$localForage.getItem("adAccount");
    this.adName = await this.$localForage.getItem("adName");
    this.department = await this.$localForage.getItem("department");
    this.ext = this.userData.ext
    this.uIp = this.userData.ip
    this.work = this.userData.work
  },
  methods: {
    modify() {
      if (this.websocket && this.validInformation) {
        // send user update command to wss server
        const cmd = {
          command: 'update_user',
          id: this.userData.id,
          info: {
            id: this.adId,
            name: this.adName,
            dept: this.department,
            ext: this.ext,
            ip: this.uIp,
            work: this.work
          }
        };
        this.websocket.send(this.packCommand(cmd));
        this.$emit('update', cmd);
      }
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
