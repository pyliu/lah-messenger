import $ from 'jquery'
import isEqual from 'lodash/isEqual'
import isEmpty from 'lodash/isEmpty'
import debounce from 'lodash/debounce'
import remove from 'lodash/remove'
import filter from 'lodash/filter'
import reject from 'lodash/reject'
import _md5 from 'md5'
import uploadAxios from 'axios'

export default ({ $axios, store }, inject) => {
  // global const variables, use this.$consts.xxxx to access them in Vue
  const consts = {
    dayMilliseconds: 8640000,
    animateAttentionSeekers:  ['bounce', 'flash', 'pulse', 'rubberBand', 'shakeX', 'shakeY', 'headShake', 'swing', 'tada', 'wobble', 'jello', 'heartBeat'],
    loadingAction: [ //(https://loading.io/animation/)
      'ld-heartbeat', 'ld-beat', 'ld-blink', 'ld-bounce', 'ld-bounceAlt', 'ld-breath', 'ld-wrench', 'ld-surprise',
      'ld-clock', 'ld-jump', 'ld-hit', 'ld-fade', 'ld-flip', 'ld-float', 'ld-move-ltr', 'ld-tremble', 'ld-tick',
      'ld-move-rtl', 'ld-move-ttb', 'ld-move-btt', 'ld-move-fade-ltr', 'ld-move-fade-rtl', 'ld-move-fade-ttb',
      'ld-move-fade-btt', 'ld-dim', 'ld-swing', 'ld-wander', 'ld-pulse', 'ld-cycle', 'ld-cycle-alt', 'ld-damage',
      'ld-fade', 'ld-flip', 'ld-flip-h', 'ld-flip-v', 'ld-float', 'ld-jelly', 'ld-jelly-alt', 'ld-jingle',
      'ld-measure', 'ld-metronome', 'ld-orbit', 'ld-rubber-h', 'ld-rubber-v', 'ld-rush-btt', 'ld-rush-ttb',
      'ld-rush-ltr', 'ld-rush-rtl', 'ld-shake-h', 'ld-shake-v', 'ld-shiver', 'ld-skew', 'ld-skew-alt', 'ld-slide-btt',
      'ld-slide-ltr', 'ld-slide-rtl', 'ld-slide-ttb', 'ld-smash', 'ld-spin', 'ld-spin-fast', 'ld-squeeze',
      'ld-swim', 'ld-swing', 'ld-tick-alt', 'ld-vortex', 'ld-vortex-alt', 'ld-wander-h', 'ld-wander-v',
      'ld-shadow', 'ld-shadow-a', 'ld-radio', 'ld-boradcast'
    ],
    loadingShapeSet: [
      'ld-spinner ld-clock',
      'ld-pie ld-flip',
      'ld-ball ld-bounce',
      'ld-hourglass ld-spin',
      'ld-ring ld-cycle',
      'ld-cross ld-spin-fast'
    ],
    loadingShapeColor: ['text-primary', 'text-secondary', 'text-danger', 'text-info', 'text-warning', 'text-default', 'text-success'],
    XHR_STATUS_CODE: {
      SUCCESS_WITH_NO_RECORD: 3,
      SUCCESS_WITH_MULTIPLE_RECORDS: 2,
      SUCCESS_NORMAL: 1,
      DEFAULT_FAIL: 0,
      UNSUPPORT_FAIL: -1,
      FAIL_WITH_LOCAL_NO_RECORD: -2,
      FAIL_NOT_VALID_SERVER: -3,
      FAIL_WITH_REMOTE_NO_RECORD: -4,
      FAIL_NO_AUTHORITY: -5,
      FAIL_JSON_ENCODE: -6,
      FAIL_NOT_FOUND: -7,
      FAIL_LOAD_ERROR: -8,
      FAIL_TIMEOUT: -9,
      FAIL_REMOTE_UNREACHABLE: -10,
      FAIL_DB_ERROR: -11
    },
    API: {
      XLSX: {
        LANDING: '/api/xlsx/landing.php',
        USER_IMPORT: '/api/import_user_xlsx.php'
      },
      JSON: {
        QUERY: '/api/query_json_api.php',
        PREFETCH: '/api/prefetch_json_api.php',
        STATS: '/api/stats_json_api.php',
        SWITCH: '/api/switch_json_api.php',
        USER: '/api/user_json_api.php',
        MSSQL: '/api/mssql_json_api.php',
        LXHWEB: '/api/lxhweb_json_api.php',
        AUTH: '/api/auth_json_api.php',
        IP: '/api/ip_json_api.php',
        SYSTEM: '/api/system_json_api.php',
        NOTIFICATION: '/api/notification_json_api.php'
      },
      FILE: {
        LOAD: '/api/load_file_api.php',
        EXPORT: '/api/export_file_api.php',
        XLSX: '/api/export_xlsx_api.php',
        TXT: '/api/export_tmp_txt.php',
        CSV: '/api/export_tmp_csv.php',
        DATA: '/api/export_txt_data.php',
        PHOTO: '/api/upload_user_photo.php',
        IMAGE: '/api/upload_image.php',
        BASE64: '/api/base64_image_convert.php'
      }
    },
    EVENT: {
      ERROR: 'lah::global::error',
      WARNING: 'lah::global::warning',
      INFO: 'lah::global::info'
    }
  }

  // like old fashion global functions, use this.$utils to access these methods in Vue
  const utility = {
    /**
     * lodash ...
     */
    empty: isEmpty, // '0' is not empty
    equal: isEqual,
    debounce, // _.debounce(func, wait, options)
    remove, // _.remove(array, function)
    filter, // _.filter(array, function)
    reject, // reverse filter
    md5: _md5,
    /**
     * usage in Vue
     * this.$utils.animated('.my-element', { name: 'bounce', duration: 'faster', delay: '' }).then((message) => {
     *  // Do something after the animation
     * })
     */
    animated (selector, opts, prefix = 'animate__') {
      return new Promise((resolve, reject) => {
        if (isEmpty(selector)) {
          reject(`selector is empty.`)
        } else if (process.client) {
          const patternLen = consts.animateAttentionSeekers.length
          const seekerIdx = parseInt(Math.random() * 1000) % patternLen
          opts = Object.assign({
            name: consts.animateAttentionSeekers[seekerIdx],
            speed: 'faster', // 'slower', 'slow', '', 'fast', 'faster' (3s, 2s, 1s, 800ms, 500ms)
            repeat: '', // repeat-[1-3], infinite
            delay: '' // delay, delay-[2s-5s]
          }, opts)
          const node = $(selector)
          if (node.length > 0) {
            node.removeClass('hide')
            const classes = `${prefix}animated ${prefix}${opts.name} ${prefix}${opts.speed} ${prefix}${opts.repeat} ${prefix}${opts.delay}`
            node.addClass(classes)
            // node[0].addEventListener('animationend', handleAnimationEnd, {once: true}
            node.one('animationend', function(e) {
              // When the animation ends, we clean the classes and resolve the Promise
              node.removeClass(classes)
                // clear ld animation also
              $(selector || '*').removeClass('ld').attr('class', function (i, c) {
                return c ? c.replace(/(^|\s+)ld-\S+/g, '') : ''
              })
              resolve(`${opts.name} animation ended.`)
            })
          } else {
            reject(`${selector} not found, can't apply animation effect.`)
          }
        } else {
          reject(`Only apply animation on client side, this animated call will be ignored.`)
        }
      })
    },
    openNewWindow (url, e) {
      if (window) {
        const win = window.open(url, '_blank')
        win.focus()
      }
    },
    statusCheck (statusCode) { return statusCode > 0 },
    rand (range) {
      return Math.floor(Math.random() * Math.floor(range || 100))
    },
    trim (x) { return typeof x === 'string' ? x.replace(/^\s+|\s+$/gm,'') : '' },
    uuid () {
      let d = Date.now()
      if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        d += performance.now() // use high-precision timer if available
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (d + Math.random() * 16) % 16 | 0
        d = Math.floor(d / 16)
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
      })
    },
    now () {
      // e.g. 2020-11-06 13:39:23
      const now = new Date()
      return now.getFullYear() + '-' +
        ('0' + (now.getMonth() + 1)).slice(-2) + '-' +
        ('0' + now.getDate()).slice(-2) + ' ' +
        ('0' + now.getHours()).slice(-2) + ':' +
        ('0' + now.getMinutes()).slice(-2) + ':' +
        ('0' + now.getSeconds()).slice(-2)
    },
    isIPv4 (str) {
      if (isEmpty(str)) {
        return false
      }
      const regex = new RegExp(`^(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}$`, 'g')
      return Boolean(str.match(regex))
    },
    ipv4Int (addr) {
      if (this.isIPv4(addr)) {
        var parts = addr.split('.').map(function(str) {
          return parseInt(str)
        })
        return (parts[0] ? parts[0] << 24 : 0) +
               (parts[1] ? parts[1] << 16 : 0) +
               (parts[2] ? parts[2] << 8  : 0) +
                parts[3]
      }
      return false
    },
    msToHuman(remain_ms) {
      const seconds = (remain_ms / 1000).toFixed(1);
      const minutes = (remain_ms / (1000 * 60)).toFixed(1);
      const hours = (remain_ms / (1000 * 60 * 60)).toFixed(1);
      const days = (remain_ms / (1000 * 60 * 60 * 24)).toFixed(1);
      if (seconds < 60) {
        return seconds + " ???";
      } else if (minutes < 60) {
        return minutes + " ??????";
      } else if (hours < 24) {
        return hours + " ??????";
      } else {
        return days + " ???"
      }
    },
    twDateStr(dateObj) {
      if (typeof dateObj !== "object") {
        console.warn('twDateStr', dateObj, 'is not an object')
        return ``
      }
      return `${dateObj.getFullYear() - 1911}${("0" + (dateObj.getMonth()+1)).slice(-2)}${("0" + dateObj.getDate()).slice(-2)}`
    },
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    assert: console.assert.bind(console),
    error: console.error.bind(console)
  }
  // all injected var can be used by {varname} in Vue and ${varname} in Nuxt, e.g. this.$http (Vue), $http (Nuxt)
  inject('consts', consts)
  inject('utils', utility)
  // inject uploading file axios
  // need to add 'Header set Access-Control-Allow-Origin "*"' to Apache site and turn on mod_header.so in httpd.conf
  uploadAxios.defaults.headers.post['Content-Type'] = 'multipart/form-data'
  inject('upload', uploadAxios)
}
