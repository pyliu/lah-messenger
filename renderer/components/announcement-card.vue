<template lang="pug">
  b-card(
    :border-variant="borderVariant"
    :header-border-variant="borderVariant"
    :header="header"
  )
    template(#header): .d-flex.justify-content-between.font-weight-bold
      span {{ dataJson['title'] }}
      span \#{{ dataJson['id'] }}
    b-card-text(v-html="content")
    template(#footer): .d-flex.justify-content-between.small.text-muted
      span {{ dataJson['sender'] }}
      span {{ dataJson['create_datetime'] }}
</template>
<script>
import isEmpty from 'lodash/isEmpty'
export default {
  props: {
    dataJson: { type: Object, required: true }
  },
  computed: {
    header () {
      return this.dataJson['title']
    },
    borderVariant () {
      const priority = parseInt(this.dataJson['priority'])
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
    content () {
      if (isEmpty(this.dataJson['content'])) {
        return ''
      }
      return this.dataJson['content'].replace(new RegExp('\r?\n','g'), '<br />')
    }
  },
  mounted () {
    // console.log(this.dataJson)
  }
}
</script>

<style lang="scss" scoped>
</style>