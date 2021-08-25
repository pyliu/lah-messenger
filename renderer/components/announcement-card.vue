<template lang="pug">
  b-card(
    :header-border-variant="borderVariant"
    :header-bg-variant="borderVariant"
    :header-text-variant="textVariant"
    :header="header"
  )
    template(#header): .d-flex.justify-content-between.font-weight-bold
      span {{ dataJson.title }}
      span \#{{ dataJson.id }}
    b-card-text(v-html="content")
    template(#footer): .d-flex.justify-content-between.small.text-muted
      span {{ dataJson.sender }}#[span.ml-1(v-if="sender !== dataJson.sender") {{ sender }}]
      span {{ dataJson.create_datetime }}
</template>

<script>
import DOMPurify from 'dompurify'
import Markd from 'marked'
import isEmpty from 'lodash/isEmpty'
export default {
  props: {
    dataJson: { type: Object, required: true }
  },
  computed: {
    header () {
      return this.dataJson.title
    },
    borderVariant () {
      const priority = parseInt(this.dataJson.priority)
      switch (priority) {
        case 0:
          return 'danger'
        case 1:
          return 'warning'
        case 2:
          return 'info'
        default:
          return 'secondary'
      }
    },
    textVariant () {
      const priority = parseInt(this.dataJson.priority)
      switch (priority) {
        case 1:
          return 'black'
        case 0:
        case 2:
        default:
          return 'white'
      }
    },
    sender () {
      return this.userMap[this.dataJson.sender] || this.dataJson.sender
    },
    content () {
      if (isEmpty(this.dataJson.content) || !DOMPurify.sanitize) {
        return ''
      }
      return DOMPurify.sanitize(Markd(this.dataJson.content))
    }
  }
}
</script>

<style lang="scss" scoped>
</style>