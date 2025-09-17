import { isEmpty } from 'lodash'

export default ($axios, store) => ({
  /**
   * 取得線上使用者
   */
  getOnlineUsers () {
    return $axios.post(store.state.api.user_online)
  },

  /**
   * 取得部門IP對應表
   */
  getDeptIp () {
    return $axios.post(store.state.api.get_dept_ip)
  },

  /**
   * 查詢AD資訊
   * @param {Object} payload 
   */
  queryAdAccount (payload) {
    return $axios.post(store.state.api.ad, payload)
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
    return $axios.post(store.state.api.announcement, payload)
  }
  // ... 其他所有與 API 相關的請求都可以集中到這裡
})
