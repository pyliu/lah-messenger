import trim from 'lodash/trim'
import { stat } from 'original-fs'

const empty = function(value) {
  return value === undefined || value === null || value === NaN || value === 0 ||
         (typeof value === 'object' && Object.keys(value).length === 0) ||
         (typeof value === 'string' && trim(value).length === 0)
}

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
  userMap: {},
  userinfo: {
    address: [],
    ipv4: '127.0.0.1',
    ipv6: '',
    userid: '',
    doamin: '',
    hostname: '',
    os: { logofile: 'Windows', kernel: '10.0.16299' },
    user: {},
    dns: []
  },
  ad: '',
  apiHost: '220.1.34.75',
  apiPort: '80',
  fePort: '8080',
  password: '',
  username: '',
  userdept: '',
  effect: '',
  history: 10,
  fetchingHistory: false,
  websocket: undefined,
  timer: null,
  imageMementoCapacity: 30,
  imageMemento: [],
  currentChannel: 'chat',
  messages: {
    'lds': [],
    'announcement': [],
    'adm': [],
    'inf': [],
    'val': [],
    'reg': [],
    'sur': [],
    'acc': [],
    'hr': [],
    'supervisor': []
  },
  unread: {
    'lds': 0,
    'announcement': 0,
    'adm': 0,
    'inf': 0,
    'val': 0,
    'reg': 0,
    'sur': 0,
    'acc': 0,
    'hr': 0,
    'supervisor': 0
  },
  participatedChannels: [],
  connectedUsers: [],
  statusText: ''
})

const getters = {
  websocket: state => state.websocket,
  connected: state => state.websocket && state.websocket.readyState === 1,
  disconnected: state => empty(state.websocket) || state.websocket.readyState === 3,
  timer: state => state.timer,
  messages: state => state.messages,
  unread: state => state.unread,
  userMap: state => state.userMap,
  userinfo: state => state.userinfo,
  username: state => state.username,
  userdept: state => state.userdept,
  domain: state => {
    let arr = state.userinfo.domain?.split('.') || []
    // remove first element that stands for the PC hostname
    arr.splice(0, 1)
    return arr.join('.')
  },
  hostname: state => state.userinfo.hostname,
  pcname: state => state.userinfo.hostname,
  userid: state => state.userinfo.userid.toUpperCase(),
  ad: state => state.ad,
  apiHost: state => state.apiHost,
  apiPort: state => state.apiPort,
  fePort: state => state.fePort,
  password: state => state.password,  // used for activedirectory query
  os: state => state.userinfo.os,
  user: state => state.userinfo.user,
  ip: state => state.userinfo.ipv4,
  address: state => state.userinfo.address,
  currentChannel: state => String(state.currentChannel),
  participatedChannels: state => state.participatedChannels,
  platform: state => `${state.userinfo.os.logofile.replace(/(^|\s)\S/g, l => l.toUpperCase())} ${state.userinfo.os.kernel}`,
  effect: state => state.effect,
  history: state => parseInt(state.history),
  fetchingHistory: state => state.fetchingHistory,
  imageMementoCapacity: state =>state.imageMementoCapacity,
  imageMemento: state => state.imageMemento,
  imageMementoCacheKey: state => 'imageMementoCached',
  connectedUsers: state => state.connectedUsers,
  connectedUsersReverse: state => state.connectedUsers.reverse(),
  connectedUsersCount: state => state.connectedUsers.length,
  statusText: state => state.statusText
}

// only sync operation
const mutations = {
  websocket (state, ws) {
    state.websocket && state.websocket.close()
    state.websocket = ws
  },
  timer (state, timer) {
    state.timer = timer
  },
  userMap (state, data) {
    state.userMap = { ...data }
  },
  userinfo (state, userinfo) {
    state.userinfo = { ...userinfo }
  },
  username (state, username) {
    state.username = username
  },
  userdept (state, userdept) {
    state.userdept = userdept
  },
  ad (state, ip) {
    state.ad = ip
  },
  apiHost (state, host) {
    state.apiHost = host
  },
  apiPort (state, port) {
    state.apiPort = port
  },
  fePort (state, port) {
    state.fePort = port
  },
  password (state, password) {
    state.password = password
  },
  effect (state, effect) {
    state.effect = effect
  },
  history (state, history) {
    state.history = parseInt(history)
  },
  fetchingHistory (state, flag) {
    state.fetchingHistory = flag
  },
  currentChannel(state, currentChannel) {
    state.currentChannel = currentChannel
  },
  addChannel (state, channel) {
    if (!empty(channel)) {
      state.messages = { ...state.messages, ...{ [channel]: [] } }
      this.$config.isDev && console.log(timestamp(), `??????/?????? ${channel} message ????????? store??? [Vuex::addChannel]`, state.messages)
    }
  },
  resetUnread (state, channel) {
    if (!empty(channel)) {
      state.unread = { ...state.unread, ...{ [channel]: 0 } }
      this.$config.isDev && console.log(timestamp(), `??????/?????? ${channel} unread ????????? store??? [Vuex::resetUnread]`, state.unread)
    }
  },
  plusUnread (state, channel) {
    if (!empty(channel)) {
      if (typeof state.unread[channel] !== 'number') {
        state.unread = { ...state.unread, ...{ [channel]: 0 } }
        this.$config.isDev && console.log(timestamp(), `??????/?????? ${channel} unread ????????? store??? [Vuex::plusUnread]`, state.unread)
      }
      state.unread[channel]++
      this.$config.isDev && console.log(timestamp(), `${channel} ???????????????????????? ${state.unread[channel]}??? [Vuex::plusUnread]`, state.unread)
    }
  },
  setUnread (state, payload) {
    const channel = payload.channel
    const count = payload.count
    if (!empty(channel)) {
      if (typeof state.unread[channel] !== 'number') {
        state.unread = { ...state.unread, ...{ [channel]: 0 } }
        this.$config.isDev && console.log(timestamp(), `??????/?????? ${channel} unread ????????? store??? [Vuex::plusUnread]`, state.unread)
      }
      state.unread[channel] = count
      this.$config.isDev && console.log(timestamp(), `${channel} ???????????????????????? ${state.unread[channel]}??? [Vuex::plusUnread]`, state.unread)
    }
  },
  resetParticipatedChannel (state) {
    state.participatedChannels.length = 0
  },
  addParticipatedChannel (state, channelPayload) {
    if (channelPayload.id && channelPayload.name) {
      const found = state.participatedChannels.find(ch => ch.id === channelPayload.id)
      if (!found) {
        state.participatedChannels = [ ... state.participatedChannels, channelPayload ]
      }
      // add/reset to messages list as well
      state.messages = { ...state.messages, ...{ [channelPayload.id]: [] } }
    } else {
      this.$config.isDev && console.log(timestamp(), `[addParticipatedChannel] channelPayload is not correct`, channelPayload)
    }
  },
  removeParticipatedChannel (state, channelPayload) {
    if (channelPayload.id) {
      state.participatedChannels = [ ...state.participatedChannels.filter(item => item.id !== channelPayload.id)]
      // remove the channel
      !delete state.messages[[channelPayload.id]] && this.$config.isDev && console.log(timestamp(), `[removeParticipatedChannel] delete ${channelPayload.id} failed`, channelPayload)
    } else {
      this.$config.isDev && console.log(timestamp(), `[removeParticipatedChannel] channelPayload is not correct`, channelPayload)
    }
  },
  imageMementoCapacity (state, capacity) { state.imageMementoCapacity = parseInt(capacity) || 30 },
  imageMemento (state, arr) {
    if (Array.isArray(arr)) {
      state.imageMemento = [...arr]
    }
  },
  addImageMemento (state, base64data) {
    this.$config.isDev && console.log(timestamp(), `?????? image data ??? store??? [Vuex::addImageMemento]`, state.imageMemento)
    if (state.imageMemento.length >= state.imageMementoCapacity) {
      const removed = state.imageMemento.shift()
      this.$config.isDev && console.log(timestamp(), `?????? image data??? [Vuex::addImageMemento]`, removed)
      state.imageMemento.length = state.imageMementoCapacity
    }
    state.imageMemento.push(base64data)
    // remove duplication
    state.imageMemento = [...state.imageMemento.filter(function(item, pos) {
        return state.imageMemento.indexOf(item) == pos;
    })]
    this.$config.isDev && console.log(timestamp(), `???????????? image data ????????? ${state.imageMemento.length}??? [Vuex::addImageMemento]`)
  },
  connectedUsers (state, array) {
    state.connectedUsers = [...array]
  },
  statusText (state, string) {
    state.statusText = string
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
  },
  async resetUnread ({ commit, getters }, channel) {
    commit('resetUnread', channel)
  },
  async plusUnread ({ commit, getters }, channel) {
    commit('plusUnread', channel)
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
