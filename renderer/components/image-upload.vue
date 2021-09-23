<template lang="pug">
  div(
    @dragover="dragover"
    @dragleave="dragleave"
    @drop="drop"
  )
    b-file(
      v-model="uploadFile"
      placeholder="僅支援上傳JPEG圖檔"
      drop-placeholder="放開以設定上傳檔案"
      browse-text="瀏覽"
      accept="image/jpeg"
    ): template(slot="file-name" slot-scope="{ names }"): b-badge(variant="primary") {{ names[0] }}
    hr
    h6.d-flex.align-items-center
      img.my-auto(src="~/assets/img/preview_black_24dp.svg")
      span.mr-auto 選定預覽
      b-button.ml-1(
        @click="publish"
        variant="outline-success"
        title="選定圖片"
        size="sm"
        v-if="!empty(encoded)"
      ): b-icon(icon="plus" scale="1.5")
    .d-flex.align-items-end(v-if="!empty(encoded)")
      b-img(
        :src="encoded"
        thumbnail
        fluid
      )
    hr
    h6
      img.mt-n1(src="~/assets/img/history_black_24dp.svg")
      span 歷史圖片
    b-img.memento.my-1(
      v-for="(memento, idx) in imageMemento"
      v-if="!$utils.empty(memento)"
      :key="`imgMemento_${idx}`"
      :src="memento"
      thumbnail
      fluid
      title="挑選這張圖片"
      style="max-width: 122.5px"
      @click="encoded = memento"
    )
</template>

<script>
export default {
  props: {
    to: { type: String, required: true },
    rightaway: { type: Boolean, default: false },
    modalId: { type: String, default: undefined }
  },
  data: () => ({
    uploadFile: undefined,
    encoded: ''
  }),
  computed: {
    name () { return this.userMap[this.to] || this.to },

  },
  watch: {
    uploadFile (file) {
      file && this.upload()
    }
  },
  methods: {
    upload () {
      if (this.uploadFile?.type === 'image/jpeg') {
        this.isBusy = true
        this.encoded = ''
        const filename = this.uploadFile.name
        const formData = new FormData()
        formData.append('file', this.uploadFile)
        formData.append('width', 430)
        formData.append('height', 330)
        formData.append('quality', 75)
        this.$upload.post(this.uploadUrl, formData).then(({ data }) => {
          if (!this.empty(data.encoded) && !this.empty(data.uri)) {
            this.encoded = `${data.uri}${data.encoded}`
            this.$store.commit('addImageMemento', this.encoded)
            this.$localForage.setItem(this.imageMementoCacheKey, this.imageMemento).catch((err) => {
              this.err('快取上傳圖檔失敗', err)
            })
            if (this.$utils.statusCheck(data.status)) {
              this.rightaway && this.sendImage(this.encoded, `給${this.name}`, this.to)
            } else {
              this.warning(data.message, { title: '上傳圖檔結果' })
            }
          } else {
            this.warning('回傳的影像編碼有誤', { title: '上傳圖檔結果' })
          }
        }).catch((err) => {
          this.err(err)
        }).finally(() => {
          this.isBusy = false
        })
      } else {
        this.warning('僅支援JPEG圖檔上傳')
      }
    },
    publish () {
      // this.sendImage(this.encoded, `給${this.name}`, this.to)
      this.$emit('publish', this.encoded)
      this.encoded = ''
      this.uploadFile = undefined
      this.hideModalById(this.modalId)
    },
    dragover (event) {
      event.stopPropagation() // Stops some browsers from redirecting
      event.preventDefault()
      // Add some visual fluff to show the user can drop its files
      if (!event.currentTarget.classList.contains('dropable')) {
        event.currentTarget.classList.add('dropable')
      }
    },
    dragleave (event) { event.currentTarget.classList.remove('dropable') },
    drop (event) {
      event.stopPropagation() // Stops some browsers from redirecting
      event.preventDefault()
      if (event.dataTransfer.files.length > 0) {
        this.uploadFile = event.dataTransfer.files[0]
      } else {
        this.log('僅支援拖放實體檔案')
      }
      // Clean up
      event.currentTarget.classList.remove('dropable')
    }
  }
}
</script>

<style lang="scss" scoped>
.memento:hover {
  border: 5px dashed gray;
  padding: 2px;
  cursor: pointer;
}
</style>
