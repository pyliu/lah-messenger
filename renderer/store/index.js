import { ipv4, ips } from '~/assets/js/ip.js'

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
