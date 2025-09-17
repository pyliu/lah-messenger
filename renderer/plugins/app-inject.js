import createApiService from '~/services/api'
import utils from '~/utils'

/**
 * 將自訂的服務與工具函式注入到 Nuxt 應用中
 */
export default ({ $axios, store }, inject) => {
  // 注入 API 服務，使用方式：this.$api.getOnlineUsers()
  inject('api', createApiService($axios, store))

  // 注入工具函式，使用方式：this.$utils.isEmpty()
  inject('utils', utils)
}
