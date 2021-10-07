<template lang="pug">
  div(
    ref="container"
    @dragover="dragover"
    @dragleave="dragleave"
    @drop="drop"
  )
    b-file(
      v-model="uploadFile"
      placeholder="支援上傳 JPG/PNG/GIF 圖檔"
      drop-placeholder="放開以設定上傳檔案"
      browse-text="瀏覽"
      :accept="supportTypes.join(',')"
    ): template(slot="file-name" slot-scope="{ names }"): b-badge(variant="primary") {{ names[0] }}
    hr
    h6.d-flex.align-items-center(ref="selectPreview")
      img.my-auto(src="~/assets/img/preview_black_24dp.svg")
      span.mr-auto 預覽
      b-button.ml-1(
        @click="publish"
        variant="outline-success"
        title="預覽圖片"
        size="sm"
        v-if="!empty(encoded)"
      ): b-icon(icon="plus" scale="1.5")
    .d-flex.align-items-end(v-if="!empty(encoded)" ref="preview")
      b-img(
        :src="encoded"
        thumbnail
        fluid
      )
    hr
    h6
      img.mt-n1(src="~/assets/img/history_black_24dp.svg")
      span 歷史圖片
      b-badge(pill) {{ imageMemento.length }}
    .d-flex.flex-wrap.align-items-center.justify-content-start: .memento-item(
      v-for="(memento, idx) in imageMementoReverse"
      v-if="!empty(memento)"
      :key="`imgMemento_${idx}`"
    )
      b-img.memento.my-1.mx-1(
        :src="memento"
        thumbnail
        fluid
        title="挑選這張圖片"
        @click="pick(memento)"
      )
      b-icon.removeIcon(
        icon="x-circle"
        title="移除這張照片"
        scale="1.25"
        @click="remove(memento)"
      )
</template>

<script>
export default {
  props: {
    to: { type: String, required: true },
    rightaway: { type: Boolean, default: false },
    skipPreview: { type: Boolean, default: false },
    modalId: { type: String, default: undefined }
  },
  data: () => ({
    uploadFile: undefined,
    encoded: '',
    supportTypes: ['image/jpeg', 'image/png', 'image/gif']
  }),
  computed: {
    name () { return this.userMap[this.to] || this.to },
    imageMementoReverse () { return [...this.imageMemento].reverse() }
  },
  watch: {
    uploadFile (file) {
      file && this.upload()
    },
    imageMemento (arr) {
      this.$localForage.setItem(this.imageMementoCacheKey, arr).catch((err) => {
        this.alert(`刪除圖檔失敗 (${err.toString()})`)
      })
    }
  },
  methods: {
    upload () {
      const type = this.uploadFile?.type
      if (this.supportTypes.includes(type)) {
        this.isBusy = true
        this.encoded = ''
        const formData = new FormData()
        formData.append('file', this.uploadFile)
        formData.append('width', 1920)
        formData.append('height', 1080)
        formData.append('quality', 80)
        this.$upload.post(this.uploadUrl, formData).then(({ data }) => {
          if (!this.empty(data.encoded) && !this.empty(data.uri)) {
            this.encoded = `${data.uri}${data.encoded}`
            this.$store.commit('addImageMemento', this.encoded)
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
        this.warning('僅支援 JPG/PNG/GIF/BMP 圖檔上傳')
      }
    },
    publish () {
      this.$emit('publish', this.encoded)
      this.encoded = ''
      this.uploadFile = undefined
      this.hideModalById(this.modalId)
    },
    pick (memento) {
      this.encoded = memento
      if (this.skipPreview) {
        this.publish()
      } else {
        this.$nextTick(() => {
          if (this.$refs.selectPreview?.scrollIntoView) {
            this.$refs.selectPreview.scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"})
            setTimeout(this.attention.bind(this, this.$refs.preview, { name: this.effect, speed: 'faster' }), 800)
          } else {
            this.$refs.container.scrollTop = 0
          }
        })
      }
    },
    remove (memento) {
      const removed = this.$utils._.remove(this.imageMemento, (imageData) => {
        return this.$utils.equal(imageData, memento)
      })
      this.$store.commit('imageMemento', this.imageMemento)
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
.memento-item {
  position: relative;
  max-width: 135px;
  margin: 2px;
  .memento:hover {
    border: 5px dashed gray;
    padding: 2px;
    cursor: pointer;
  }
  .removeIcon {
    transition: all .5s;
    z-index: 1001;
    cursor: pointer;
    font-weight: 500;
    color: red;
    position: absolute;
    top: 0;
    right: 0;
    &:hover {
      font-size: 1.25rem;
      font-weight: 900;
    }
  }
}
</style>
