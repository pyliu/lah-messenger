import { ipv4, ips } from '~/assets/js/ip.js'

const timestamp = (full = false) => {
  // e.g. 2020-12-03 10:23:00
  const now = new Date()
  const time = ('0' + now.getHours()).slice(-2) + ':' +
               ('0' + now.getMinutes()).slice(-2) + ':' +
               ('0' + now.getSeconds()).slice(-2)
  if (full) {
    return now.getFullYear() + '-' +
      ('0' + (now.getMonth() + 1)).slice(-2) + '-' +
      ('0' + now.getDate()).slice(-2) + ' ' +
      time
  }
  return time
}

const state = () => ({
  websocket: undefined,
  timer: null,
  messages: {},
  address: [ ...ips ],
  ip: ipv4
})

const getters = {
  websocket: state => state.websocket,
  timer: state => state.timer,
  messages: state => state.messages,
  ip: state => state.ip,
  address: state => state.address
}

// only sync operation
const mutations = {
  websocket (state, ws) {
    state.websocket = ws
  },
  timer (state, timer) {
    state.timer = timer
  },
  ip (state, ip) {
    state.ip = ip
  },
  address (state, address) {
    state.address = [ ...address ]
  },
  addChannel (state, channel) {
    state.messages = { ...state.messages, ...{[channel]: []} }
    this.$config.isDev && console.log(timestamp(), `新增 ${channel} 頻道到 store。 [Vuex::addChannel]`, state.messages)
  }
}

// support async operation
const actions = {
  // Nuxt provided hook feature for Vuex, calling at server side when store initializing
  async nuxtServerInit ({ commit, dispatch }, nuxt) {
    try {
      // init once here
      // add default channel
      commit('addChannel', process.env['USERNAME'])
    } catch (e) {
      console.error(e)
    }
  }
}

export default {
  state,
  actions,
  mutations,
  getters,
  namespaced: true,
  strict: false
}
