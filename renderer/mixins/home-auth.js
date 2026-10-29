/**
 * @file home-auth.js
 * @description 首頁使用者身分、AD 查詢、API 資料快取同步與登入控制 Mixin
 */
import trim from 'lodash/trim'

const isProd = process.env.NODE_ENV === 'production'
const FORMAL_ACCOUNT_REGEX = /^H[A-H]\d+$/i

export default {
  data: () => ({
    manualLogin: false,
    isAdminLogin: false,
    adAvailable: true,
    adHost: '',
    adAccount: '',
    adName: '',
    adPassword: '',
    adPasswordIcon: 'eye-slash',
    adPasswordType: 'password',
    department: '',
    departmentOpts: [
      { value: '', text: '選擇部門' },
      { value: 'reg', text: '登記課' },
      { value: 'inf', text: '資訊課' },
      { value: 'adm', text: '行政課' },
      { value: 'sur', text: '測量課' },
      { value: 'val', text: '地價課' }
    ],
    autoConnectTimer: null,
    autoConnectScheduled: false,
    adQuerying: false
  }),

  computed: {
    avatarText () {
      if (!this.empty(this.adName)) {
        return this.adName.slice(-2)
      }
      if (!this.empty(this.adAccount)) {
        return this.adAccount.slice(0, 2).toUpperCase()
      }
      return '即'
    },

    deptName () {
      return this.getDepartmentName(this.department)
    },

    userQueryStr () {
      return `${this.apiQueryUrl}${this.$consts.API.JSON.USER}`
    },

    validAdHost () {
      return this.$utils.isIPv4(this.adHost) === false ? false : null
    },

    validAdAccount () {
      if (this.manualLogin || this.isAdminLogin) {
        return !this.empty(this.adAccount)
      }
      return !this.empty(this.adAccount) && FORMAL_ACCOUNT_REGEX.test(this.adAccount)
    },

    validAdName () {
      return !this.empty(this.adName)
    },

    validAdPassword () {
      return this.empty(this.adPassword) ? false : null
    },

    validDepartment () {
      return !this.$utils.empty(trim(this.department))
    },

    validInformation () {
      return (
        this.validAdAccount &&
        this.validAdName &&
        this.validDepartment &&
        this.validPort &&
        this.validHost
      )
    },

    disabledAdLoginBtn () {
      return (
        this.empty(this.adPassword) ||
        this.validAdHost === false ||
        this.validAdAccount === false
      )
    },

    queryADVariant () {
      if (this.empty(this.adAccount)) return 'primary'
      if (this.empty(this.adName)) return 'warning'
      return 'success'
    }
  },

  watch: {
    adAccount (val) {
      this.$localForage.setItem('adAccount', val)
      this.$store.commit('userid', val)
      this.$nextTick(() => {
        if (this.validAdAccount) this.loadApiADUserData()
      })
    },

    department (val) {
      this.resetReconnectTimer()
      this.$store.commit('userdept', val)
      this.$localForage.setItem('department', val)
      this.updateWindowTitle()
    },

    manualLogin (flag) {
      if (!flag && !this.connected) {
        this.isAdminLogin = false
      }
      flag ? this.clearReconnectTimer() : this.resetReconnectTimer()
    },

    userid (val) {
      !this.empty(val) && val !== this.adAccount && (this.adAccount = val)
    },

    adHost (val) {
      this.$store.commit('ad', val)
      this.$localForage.setItem('adHost', val)
    },

    adName (val) {
      this.$localForage.setItem('adName', val)
      this.$store.commit('username', val)
      this.updateWindowTitle()
    },

    adPassword (val) {
      this.$store.commit('password', val)
      this.$localForage.setItem('adPassword', val)
    },

    userMap (newMap) {
      if (newMap && this.validAdAccount) {
        const mappedName = newMap[this.adAccount]
        if (mappedName && (this.empty(this.adName) || this.adName === '請更新' || this.adName === this.adAccount || !/[\u4e00-\u9fa5]/.test(this.adName))) {
          this.adName = mappedName
          this.$store.commit('username', mappedName)
          this.$localForage.setItem('adName', mappedName)
        }
      }
    },

    apiUserinfo (val) {
      this.handleApiUserInfoUpdate(val)
    }
  },

  methods: {
    switchAdPasswordIcon () {
      if (this.adPasswordType === 'password') {
        this.adPasswordType = 'text'
        this.adPasswordIcon = 'eye'
      } else {
        this.adPasswordType = 'password'
        this.adPasswordIcon = 'eye-slash'
      }
    },

    invokeADQuery () {
      if (!this.adAvailable) {
        this.alert('AD 伺服器離線或尚未設定，無法進行網域查詢驗證！', { variant: 'warning' })
        return
      }
      this.asking = true
      this.ipcRenderer
        .invoke('auth', {
          url: `ldap://${this.adHost}`,
          baseDN: `DC=${this.domain.split('.').join(',DC=')}`,
          username: `${this.adAccount}@${this.domain}`,
          password: this.adPassword
        })
        .then((result) => {
          this.$store.commit('userid', this.adAccount)
          this.$store.commit('username', result.description)
          this.adName = result.description
          this.department = result.group
          this.connect()
        })
        .catch((err) => {
          this.alert('查詢失敗，密碼錯誤!?', { title: `ldap://${this.adHost}` })
        })
        .finally(() => {
          this.asking = false
        })
    },

    loadApiUserData () {
      if (this.validHost) {
        this.$axios
          .post(this.userQueryStr, { type: 'authentication', ip: this.ip })
          .then(({ data }) => {
            if (this.$utils.statusCheck(data.status)) {
              if (data.ad_available !== undefined) {
                this.adAvailable = Boolean(data.ad_available)
              }
              this.setCache(
                'userAuthority',
                data.authority,
                this.userDataCacheDuration
              )
              this.setCache(
                'apiUserinfo',
                data.info,
                this.userDataCacheDuration
              )
              this.$store.commit('authority', data.authority)
              this.$store.commit('apiUserinfo', data.info)
            }
          })
          .catch((err) => console.warn('載入 API 使用者資料失敗:', err.toString()))
      } else {
        this.timeout(this.loadApiUserData, 400)
      }
    },

    loadApiADUserData () {
      if (this.adQuerying) return
      if (!this.adAvailable) {
        if (!isProd) console.log('[loadApiADUserData] AD 伺服器離線或未啟用，略過 AD 查詢')
        return
      }

      if (this.validHost && this.validAdAccount) {
        this.adQuerying = true

        this.$axios
          .post(this.userQueryStr, { type: 'ad_user_info', id: this.adAccount })
          .then(({ data }) => {
            if (this.$utils.statusCheck(data.status)) {
              const raw = data.raw || data.data || {}
              const resolvedName = !this.empty(raw.name)
                ? raw.name
                : ((this.userMap && this.userMap[this.adAccount]) || this.adAccount)

              if (!this.empty(resolvedName) && (this.empty(this.adName) || this.adName === '請更新' || this.adName === this.adAccount || !/[\u4e00-\u9fa5]/.test(this.adName))) {
                this.adName = resolvedName
                this.$store.commit('username', resolvedName)
                this.$localForage.setItem('adName', resolvedName)
              }

              const deptArr = raw.department
              if (Array.isArray(deptArr) && deptArr.length > 0) {
                const deptName = deptArr[0]
                if (deptArr.length === 1 || this.empty(this.department)) {
                  const prev = this.deptName
                  this.handleApiUserInfoUpdate({ unit: deptName })
                  this.$store.commit('apiUserinfo', { unit: deptName })
                  if (prev !== deptName) {
                    this.ipcRenderer.invoke('change-user-dept', {
                      api: `${this.apiQueryUrl}${this.$consts.API.JSON.USER}`,
                      type: 'upd_dept',
                      id: this.userid,
                      dept: deptName
                    })
                  }
                }
              }
            }
          })
          .catch((err) => {
            if (this.empty(this.adName) || this.adName === '請更新' || this.adName === this.adAccount || !/[\u4e00-\u9fa5]/.test(this.adName)) {
              const fallbackName = (this.userMap && this.userMap[this.adAccount]) || this.adAccount
              if (!this.empty(fallbackName)) {
                this.adName = fallbackName
              }
            }
            if (!isProd) console.warn('[loadApiADUserData] API 呼叫失敗，已使用 Fallback 名稱：', this.adName, err)
          })
          .finally(() => {
            this.adQuerying = false
          })
      } else {
        this.timeout(this.loadApiADUserData, 400)
      }
    },

    loadUserMapData () {
      if (this.validHost) {
        this.$axios
          .post(this.userQueryStr, { type: 'user_mapping' })
          .then(({ data }) => {
            if (this.$utils.statusCheck(data.status)) {
              this.$store.commit('userMap', data.data)
              this.setCache('userMap', data.data, this.userDataCacheDuration)
              this.setCache('userMapping', data.data, this.userDataCacheDuration)
              if (this.validAdAccount && data.data && data.data[this.adAccount]) {
                const mappedName = data.data[this.adAccount]
                if (this.empty(this.adName) || this.adName === '請更新' || this.adName === this.adAccount || !/[\u4e00-\u9fa5]/.test(this.adName)) {
                  this.adName = mappedName
                  this.$store.commit('username', mappedName)
                  this.$localForage.setItem('adName', mappedName)
                }
              }
            }
          })
          .catch((err) => console.warn('載入使用者對應表失敗:', err.toString()))
      } else {
        this.timeout(this.loadUserMapData, 400)
      }
    },

    refreshApiDepartment (v) {
      if (!this.$utils.empty(v)) {
        const n = this.getDepartmentName(v)
        this.$store.commit('apiUserinfo', { unit: n })
        this.ipcRenderer.invoke('change-user-dept', {
          api: `${this.apiQueryUrl}${this.$consts.API.JSON.USER}`,
          type: 'upd_dept',
          id: this.userid,
          dept: n
        })
      }
    },

    handleApiUserInfoUpdate (v) {
      this.department =
        {
          '資訊課': 'inf',
          '行政課': 'adm',
          '登記課': 'reg',
          '測量課': 'sur',
          '地價課': 'val',
          '人事室': 'hr',
          '會計室': 'acc'
        }[v?.unit] || 'supervisor'
    },

    getDepartmentName (v) {
      return (
        {
          'inf': '資訊課',
          'adm': '行政課',
          'reg': '登記課',
          'sur': '測量課',
          'val': '地價課',
          'hr': '人事室',
          'acc': '會計室',
          'supervisor': '主任祕書室'
        }[v] || '未知課室'
      )
    },

    handleAdminConnect (info) {
      this.wsHost = info.host
      this.wsPort = info.port
      this.adAccount = info.id
      this.adName = info.name
      this.department = info.dept
      this.isAdminLogin = true
      this.manualLogin = false
      this.connect()
    },

    queryUserInfo () {
      this.ipcRenderer.invoke('userinfo').then((u) => {
        if (u) {
          this.setUserInfo(u)
        } else {
          this.$localForage.getItem('userinfo').then((cached) => {
            if (cached) this.setUserInfo(cached)
          })
        }
      }).catch((err) => {
        console.warn('無法取得本機 userinfo:', err)
        this.$localForage.getItem('userinfo').then((cached) => {
          if (cached) this.setUserInfo(cached)
        })
      })
    },

    async setUserInfo (u) {
      if (!u) return
      if (!this.empty(u.userid)) {
        this.adAccount = u.userid
      }

      // 智慧姓名解析：過濾 Windows 內建管理員描述 -> 員工對照表 -> 現有姓名/帳號
      const isSystemDesc = u.realname && (u.realname.includes('管理電腦') || u.realname.toLowerCase().includes('admin'))
      if (!this.empty(u.realname) && /[\u4e00-\u9fa5]/.test(u.realname) && !isSystemDesc) {
        this.adName = u.realname
      } else if (this.userMap && this.userMap[this.adAccount]) {
        this.adName = this.userMap[this.adAccount]
      } else if (this.empty(this.adName) || this.adName === '請更新') {
        this.adName = !isSystemDesc ? (u.realname || this.adAccount) : '請更新'
      }

      this.$store.commit('userid', this.adAccount)
      this.$store.commit('username', this.adName)
      this.$store.commit('userinfo', u)
      this.$localForage.setItem('userinfo', u)

      if (this.validAdAccount) {
        this.$localForage.setItem('adAccount', this.adAccount)
        this.$localForage.setItem('adName', this.adName)
      }

      if (!this.$utils.isIPv4(this.adHost)) this.adHost = this.getFirstDNSIp()
      this.updateWindowTitle()

      if (this.validAdAccount) {
        this.register()
        this.ipcRenderer.invoke('injectUserinfo', { ...u, userdept: this.userdept })

        // 非同步向後端 API 查詢部門與補充姓名
        this.loadApiADUserData()

        // 排程智慧自動登入
        this.triggerAutoConnect()
      } else {
        console.warn('[setUserInfo] 檢測到非八所正式公務帳號 (需為 H[A-H] 開頭搭配數字)，阻擋自動註冊與連線:', this.adAccount)
      }
    },

    triggerAutoConnect () {
      if (this.manualLogin) return
      if (this.connected || this.connecting) return
      if (!this.validInformation) return
      if (this.autoConnectScheduled) return

      this.autoConnectScheduled = true
      this.autoConnectTimer = setTimeout(() => {
        if (!this.connected && !this.connecting && this.validInformation && !this.manualLogin) {
          this.log(this.time(), '自動登入中...')
          this.connect()
        }
      }, 1200)
    },

    handleManualEnter () {
      if (this.autoConnectTimer) {
        clearTimeout(this.autoConnectTimer)
        this.autoConnectTimer = null
      }
      this.connect()
    },

    async checkDefaultSvrIp () {
      this.wsHost =
        (await this.$localForage.getItem('wsHost')) ||
        this.defaultSvrIp ||
        (await this.timeout(this.checkDefaultSvrIp, 400))
      this.$store.commit('wsHost', this.wsHost)
    },

    reportToAPIServer () {
      this.ipcRenderer.invoke('add-ip-entry', {
        api: `${this.apiQueryUrl}${this.$consts.API.JSON.IP}`,
        type: 'add_user_ip_entry',
        note: `${this.domain} ${this.department}`,
        entry_id: this.adAccount,
        entry_desc: this.adName
      })
    },

    async restoreSettings () {
      let savedWsHost = await this.$localForage.getItem('wsHost')
      if (process.env.isDev && savedWsHost && savedWsHost.startsWith('220.1.')) {
        savedWsHost = (process.env.API_HOST === 'localhost' ? '127.0.0.1' : process.env.API_HOST) || '127.0.0.1'
        await this.$localForage.setItem('wsHost', savedWsHost)
      }
      this.wsHost = savedWsHost || (process.env.isDev ? '127.0.0.1' : '')
      this.wsPort = (await this.$localForage.getItem('wsPort')) || 8081
      const wsHttpPort = (await this.$localForage.getItem('wsHttpPort')) || 8082
      this.$store.commit('wsHost', this.wsHost)
      this.$store.commit('wsPort', this.wsPort)
      this.$store.commit('wsHttpPort', wsHttpPort)
      this.adHost = (await this.$localForage.getItem('adHost')) || ''

      this.adPassword = await this.$localForage.getItem('adPassword')

      const savedDept = await this.$localForage.getItem('department')
      if (!this.$utils.empty(savedDept)) {
        this.department = savedDept
      } else if (this.$utils.empty(this.department)) {
        this.department = 'hr'
      }

      const savedName = await this.$localForage.getItem('adName')
      const isSystemName = savedName && (savedName.includes('管理電腦') || savedName.toLowerCase().includes('admin'))
      if (!this.$utils.empty(savedName) && !isSystemName) {
        this.adName = savedName
      } else if (this.$utils.empty(this.adName)) {
        this.adName = '請更新'
      }

      const savedAccount = await this.$localForage.getItem('adAccount')
      if (!this.$utils.empty(savedAccount)) {
        if (FORMAL_ACCOUNT_REGEX.test(savedAccount)) {
          this.adAccount = savedAccount
        } else {
          console.warn('[restoreSettings] 忽略並清除快取中的非正式帳號:', savedAccount)
          await this.$localForage.removeItem('adAccount')
        }
      }

      // 同步讀取本機儲存的字體大小並套用
      this.currentFontSize = (await this.$localForage.getItem('fontSize')) || 'normal'
      const sizeMap = { normal: '16px', medium: '18px', large: '20px' }
      document.documentElement.style.setProperty('font-size', sizeMap[this.currentFontSize] || '16px', 'important')
    }
  }
}
