import createApiService from '~/plugins/api';
import consts from '~/plugins/consts';
import utils from '~/plugins/utils';

import uploadAxios from 'axios';
import qs from 'qs';

/**
 * 將自訂的服務與工具函式注入到 Nuxt 應用中
 */
export default ({ $axios, store }, inject) => {
  // 注入常數，使用方式：this.$consts.dayMilliseconds
  inject('consts', consts)
  // 注入 API 服務，使用方式：this.$api.getOnlineUsers()
  inject('api', createApiService($axios, store))
  // 注入工具函式，使用方式：this.$utils.isEmpty()
  inject('utils', utils)
  // 以下是 axios.js 的內容
  const cancelTokenSource = $axios.CancelToken.source();
  $axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded'
  $axios.onRequest(config => {
    if (config.data && config.headers[config.method]['Content-Type'] === 'application/x-www-form-urlencoded') {
      config.data = qs.stringify(config.data)
    }
    config.cancelToken = cancelTokenSource.token

    return config
  })
  $axios.onResponse(response => {
    
  })
  $axios.onError(error => {
    utils.error(error)
    // redirect('/error')
  })
  inject('acts', cancelTokenSource) // e.g. this.$acts.cancel('axios request has been cancelled!') in Vue
  // inject uploading file axios
  // need to add 'Header set Access-Control-Allow-Origin "*"' to Apache site and turn on mod_header.so in httpd.conf
  uploadAxios.defaults.headers.post['Content-Type'] = 'multipart/form-data'
  inject('upload', uploadAxios)
}
