<template lang="pug">
  transition(
    :enter-active-class="animated_in"
    :leave-active-class="animated_out"
    :mode="mode"
    :appear="appear"
    @enter="enter($event)"
    @leave="leave($event)"
    @after-enter="afterEnter($event)"
    @after-leave="afterLeave($event)"
    tag="div"
  )
    slot 轉場內容會顯示在這邊
</template>

<script>
export default {
  props: {
    appear: { type: Boolean, default: false },
    fade: { type: Boolean, default: false },
    slide: { type: Boolean, default: false },
    slideDown: { type: Boolean, default: false },
    slideUp: { type: Boolean, default: false },
    zoom: { type: Boolean, default: false },
    bounce: { type: Boolean, default: false },
    rotate: { type: Boolean, default: false },
    speed: { type: String, default: 'faster' },
    repeat: { type: String, default: '' },
    delay: { type: String, default: '' }
  },
  data: () => ({
    prefix: 'animate__', // animate.css v4 has a default prefix => 'animate__' to avoid css name conflict
    animated_in: '',
    animated_out: '',
    mode: 'out-in', // out-in, in-out
    speed_css: 'faster',
    animateTransitions: []
  }),
  computed: {
    utilityCss () {
      let speed = `${this.prefix}faster`; let delay = ''; let repeat = ''
      switch (this.speed) {
        case '':
        case 'normal':
          speed = ''
          break
        case 'faster':
          speed = `${this.prefix}faster`
          break
        case 'fast':
          speed = `${this.prefix}fast`
          break
        case 'slower':
          speed = `${this.prefix}slower`
          break
        case 'slow':
          speed = `${this.prefix}slow`
          break
      }
      switch (this.delay) {
        case '2s':
        case '3s':
        case '4s':
        case '5s':
          delay = `${this.prefix}delay-${this.delay}`
          break
      }
      switch (this.repeat) {
        case '1':
        case '2':
        case '3':
          repeat = `${this.prefix}repeat-${this.repeat}`
          break
        case 'infinite':
          repeat = `${this.prefix}infinite`
          break
      }
      return `${speed} ${delay} ${repeat}`
    }
  },
  created () {
    this.animateTransitions = [
      // rotate
      { in: `${this.prefix}animated ${this.prefix}rotateIn`, out: `${this.prefix}animated ${this.prefix}rotateOut` },
      { in: `${this.prefix}animated ${this.prefix}rotateInDownLeft`, out: `${this.prefix}animated ${this.prefix}rotateOutDownLeft` },
      { in: `${this.prefix}animated ${this.prefix}rotateInDownRight`, out: `${this.prefix}animated ${this.prefix}rotateOutDownRight` },
      { in: `${this.prefix}animated ${this.prefix}rotateInUpLeft`, out: `${this.prefix}animated ${this.prefix}rotateOutUpLeft` },
      { in: `${this.prefix}animated ${this.prefix}rotateInUpRight`, out: `${this.prefix}animated ${this.prefix}rotateOutUpRight` },
      // bounce
      { in: `${this.prefix}animated ${this.prefix}bounceIn`, out: `${this.prefix}animated ${this.prefix}bounceOut` },
      { in: `${this.prefix}animated ${this.prefix}bounceInUp`, out: `${this.prefix}animated ${this.prefix}bounceOutDown` },
      { in: `${this.prefix}animated ${this.prefix}bounceInDown`, out: `${this.prefix}animated ${this.prefix}bounceOutUp` },
      { in: `${this.prefix}animated ${this.prefix}bounceInRight`, out: `${this.prefix}animated ${this.prefix}bounceOutLeft` },
      { in: `${this.prefix}animated ${this.prefix}bounceInLeft`, out: `${this.prefix}animated ${this.prefix}bounceOutRight` },
      // fade
      { in: `${this.prefix}animated ${this.prefix}fadeIn`, out: `${this.prefix}animated ${this.prefix}fadeOut` },
      { in: `${this.prefix}animated ${this.prefix}fadeInDown`, out: `${this.prefix}animated ${this.prefix}fadeOutUp` },
      { in: `${this.prefix}animated ${this.prefix}fadeInDownBig`, out: `${this.prefix}animated ${this.prefix}fadeOutUpBig` },
      { in: `${this.prefix}animated ${this.prefix}fadeInLeft`, out: `${this.prefix}animated ${this.prefix}fadeOutRight` },
      { in: `${this.prefix}animated ${this.prefix}fadeInLeftBig`, out: `${this.prefix}animated ${this.prefix}fadeOutRightBig` },
      { in: `${this.prefix}animated ${this.prefix}fadeInRight`, out: `${this.prefix}animated ${this.prefix}fadeOutLeft` },
      { in: `${this.prefix}animated ${this.prefix}fadeInRightBig`, out: `${this.prefix}animated ${this.prefix}fadeOutLeftBig` },
      { in: `${this.prefix}animated ${this.prefix}fadeInUp`, out: `${this.prefix}animated ${this.prefix}fadeOutDown` },
      { in: `${this.prefix}animated ${this.prefix}fadeInUpBig`, out: `${this.prefix}animated ${this.prefix}fadeOutDownBig` },
      // flip
      { in: `${this.prefix}animated ${this.prefix}flipInX`, out: `${this.prefix}animated ${this.prefix}flipOutX` },
      { in: `${this.prefix}animated ${this.prefix}flipInY`, out: `${this.prefix}animated ${this.prefix}flipOutY` },
      // lightspeed
      { in: `${this.prefix}animated ${this.prefix}lightSpeedIn`, out: `${this.prefix}animated ${this.prefix}lightSpeedOut` },
      // roll
      { in: `${this.prefix}animated ${this.prefix}rollIn`, out: `${this.prefix}animated ${this.prefix}rollOut` },
      // zoom
      { in: `${this.prefix}animated ${this.prefix}zoomIn`, out: `${this.prefix}animated ${this.prefix}zoomOut` },
      { in: `${this.prefix}animated ${this.prefix}zoomInDown`, out: `${this.prefix}animated ${this.prefix}zoomOutUp` },
      { in: `${this.prefix}animated ${this.prefix}zoomInLeft`, out: `${this.prefix}animated ${this.prefix}zoomOutRight` },
      { in: `${this.prefix}animated ${this.prefix}zoomInRight`, out: `${this.prefix}animated ${this.prefix}zoomOutLeft` },
      { in: `${this.prefix}animated ${this.prefix}zoomInUp`, out: `${this.prefix}animated ${this.prefix}zoomOutDown` },
      // slide
      { in: `${this.prefix}animated ${this.prefix}slideInDown`, out: `${this.prefix}animated ${this.prefix}slideOutUp` },
      { in: `${this.prefix}animated ${this.prefix}slideInUp`, out: `${this.prefix}animated ${this.prefix}slideOutDown` },
      { in: `${this.prefix}animated ${this.prefix}slideInLeft`, out: `${this.prefix}animated ${this.prefix}slideOutRight` },
      { in: `${this.prefix}animated ${this.prefix}slideInRight`, out: `${this.prefix}animated ${this.prefix}slideOutLeft` }
    ]
    if (this.rotate) {
      this.animated_in = `${this.prefix}animated ${this.prefix}rotateIn ${this.utilityCss}`
      this.animated_out = `${this.prefix}animated ${this.prefix}rotateOut ${this.utilityCss}`
    } else if (this.bounce) {
      this.animated_in = `${this.prefix}animated ${this.prefix}bounceIn ${this.utilityCss}`
      this.animated_out = `${this.prefix}animated ${this.prefix}bounceOut ${this.utilityCss}`
    } else if (this.zoom) {
      this.animated_in = `${this.prefix}animated ${this.prefix}zoomIn ${this.utilityCss}`
      this.animated_out = `${this.prefix}animated ${this.prefix}zoomOut ${this.utilityCss}`
    } else if (this.fade) {
      this.animated_in = `${this.prefix}animated ${this.prefix}fadeIn ${this.utilityCss}`
      this.animated_out = `${this.prefix}animated ${this.prefix}fadeOut ${this.utilityCss}`
    } else if (this.slideDown || this.slide) {
      this.animated_in = `${this.prefix}animated ${this.prefix}slideInDown ${this.utilityCss}`
      this.animated_out = `${this.prefix}animated ${this.prefix}slideOutUp ${this.utilityCss}`
    } else if (this.slideUp) {
      this.animated_in = `${this.prefix}animated ${this.prefix}slideInUp ${this.utilityCss}`
      this.animated_out = `${this.prefix}animated ${this.prefix}slideOutDown ${this.utilityCss}`
    } else {
      this.randAnimation()
    }
  },
  methods: {
    enter (e) {
      this.$emit('enter', e)
    },
    leave (e) {
      this.$emit('leave', e)
    },
    afterEnter (e) {
      this.$emit('after-enter', e)
    },
    afterLeave (e) {
      this.$emit('after-leave', e)
    },
    randAnimation () {
      const count = this.animateTransitions.length
      const this_time = this.animateTransitions[this.$utils.rand(this.animateTransitions.length)]
      this.animated_in = `${this_time.in} ${this.utilityCss}`
      this.animated_out = `${this_time.out} ${this.utilityCss}`
    }
  }
}
</script>

<style lang="scss"></style>
