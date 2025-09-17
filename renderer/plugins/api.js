import { isEmpty } from 'lodash'
import consts from './consts'

export default ($axios, store) => ({
  /**
   * example API request
   */
  getOnlineUsers () {
    return $axios.post(consts.API.JSON.XXXXXX)
  },

  /**
   * 取得部門IP對應表
   */
  getDeptIp () {
    return $axios.post(consts.API.JSON.XXXXXX)
  },

  /**
   * 查詢AD資訊
   * @param {Object} payload 
   */
  queryAdAccount (payload) {
    return $axios.post(consts.API.JSON.XXXXXX, payload)
  },

  /**
   * 取得最新公告
   * @param {String} dept 
   */
  getLatestAnnouncement (dept) {
    const payload = {
      // 公告 API 需要的參數
      dept: isEmpty(dept) ? store.state.userinfo.dept : dept
    }
    return $axios.post(consts.API.JSON.XXXXXX, payload)
  }
  // ... 其他所有與 API 相關的請求都可以集中到這裡
})
