<template>
  <div class="d-flex justify-content-center align-items-center vh-100 bg-white">
    <div class="text-center">
      <div class="spinner-border text-primary" role="status">
        <span class="sr-only">載入中...</span>
      </div>
      <div class="mt-2 text-muted small">系統載入中...</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'IndexPage',
  mounted () {
    this.$router.replace('/home')
  }
}
</script>
