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
  currentChannel: process.env['USERNAME'],
  messages: {
    'announcement': [],
    'adm': [],
    'inf': [],
    'val': [],
    'reg': [],
    'sur': [],
    'acc': [],
    'hr': [],
    'supervisor': [],
    [process.env['USERNAME']]: []
  },
  unread: {
    'announcement': 0,
    'adm': 0,
    'inf': 0,
    'val': 0,
    'reg': 0,
    'sur': 0,
    'acc': 0,
    'hr': 0,
    'supervisor': 0,
    [process.env['USERNAME']]: 0
  },
  address: [ ...ips ],
  ip: ipv4
})

const getters = {
  websocket: state => state.websocket,
  timer: state => state.timer,
  messages: state => state.messages,
  unread: state => state.unread,
  ip: state => state.ip,
  address: state => state.address,
  currentChannel: state => state.currentChannel
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
  currentChannel(state, currentChannel) {
    state.currentChannel = currentChannel
  },
  addChannel (state, channel) {
    state.messages = { ...state.messages, ...{ [channel]: [] } }
    this.$config.isDev && console.log(timestamp(), `新增/重設 ${channel} message 頻道到 store。 [Vuex::addChannel]`, state.messages)
  },
  addUnread (state, channel) {
    state.unread = { ...state.unread, ...{ [channel]: 0 } }
    this.$config.isDev && console.log(timestamp(), `新增/重設 ${channel} unread 頻道到 store。 [Vuex::addUnread]`, state.unread)
  },
  plusUnread (state, channel) {
    if (parseInt(state.unread[channel]) === NaN) {
      state.unread = { ...state.unread, ...{ [channel]: 0 } }
      this.$config.isDev && console.log(timestamp(), `新增/重設 ${channel} unread 頻道到 store。 [Vuex::plusUnread]`, state.unread)
    }
    state.unread[channel]++
    this.$config.isDev && console.log(timestamp(), `${channel} 頻道未讀計數增為 ${state.unread[channel]}。 [Vuex::plusUnread]`, state.unread)
  }
}

// support async operation
const actions = {
  // Nuxt provided hook feature for Vuex, calling at server side when store initializing
  async nuxtServerInit ({ commit, dispatch }, nuxt) {
    try {
      // init once here
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
