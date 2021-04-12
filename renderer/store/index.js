import isEmpty from 'lodash/isEmpty'
import trimStart from 'lodash/trimStart'

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
  userinfo: {
    address: [],
    ipv4: '127.0.0.1',
    ipv6: '',
    userid: '',
    doamin: '',
    hostname: '',
    os: { logofile: 'XXXXXX', kernel: 'xx.x.xxxxx' },
    user: {}
  },
  username: '',
  userdept: '',
  websocket: undefined,
  timer: null,
  currentChannel: '',
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
  participatedChannels: []
})

const getters = {
  websocket: state => state.websocket,
  connected: state => state.websocket && state.websocket.readyState === 1,
  disconnected: state => isEmpty(state.websocket) || state.websocket.readyState === 3,
  timer: state => state.timer,
  messages: state => state.messages,
  unread: state => state.unread,
  userinfo: state => state.userinfo,
  username: state => state.username,
  userdept: state => state.userdept,
  domain: (state) => {
    return trimStart(state.userinfo.domain, `${state.userinfo.hostname}.`)
  },
  hostname: state => state.userinfo.hostname,
  userid: state => state.userinfo.userid.toUpperCase(),
  os: state => state.userinfo.os,
  user: state => state.userinfo.user,
  ip: state => state.userinfo.ipv4,
  address: state => state.userinfo.address,
  currentChannel: state => state.currentChannel,
  participatedChannels: state => state.participatedChannels
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
  userinfo (state, userinfo) {
    state.userinfo = { ...userinfo }
  },
  username (state, username) {
    state.username = username
  },
  userdept (state, userdept) {
    state.userdept = userdept
  },
  currentChannel(state, currentChannel) {
    state.currentChannel = currentChannel
  },
  addChannel (state, channel) {
    if (!isEmpty(channel)) {
      state.messages = { ...state.messages, ...{ [channel]: [] } }
      this.$config.isDev && console.log(timestamp(), `新增/重設 ${channel} message 頻道到 store。 [Vuex::addChannel]`, state.messages)
    }
  },
  resetUnread (state, channel) {
    if (!isEmpty(channel)) {
      state.unread = { ...state.unread, ...{ [channel]: 0 } }
      this.$config.isDev && console.log(timestamp(), `新增/重設 ${channel} unread 頻道到 store。 [Vuex::resetUnread]`, state.unread)
    }
  },
  plusUnread (state, channel) {
    if (!isEmpty(channel)) {
      if (state.unread[channel] !== '99+') {
        if (parseInt(state.unread[channel]) === NaN) {
          state.unread = { ...state.unread, ...{ [channel]: 0 } }
          this.$config.isDev && console.log(timestamp(), `新增/重設 ${channel} unread 頻道到 store。 [Vuex::plusUnread]`, state.unread)
        }
        state.unread[channel]++
        // maximun is 99
        state.unread[channel] > 99 && (state.unread[channel] = '99+')
        this.$config.isDev && console.log(timestamp(), `${channel} 頻道未讀計數增為 ${state.unread[channel]}。 [Vuex::plusUnread]`, state.unread)
      } else {
        this.$config.isDev && console.log(timestamp(), `${channel} 頻道未讀計數增加已達最大值 ${state.unread[channel]}。 [Vuex::plusUnread]`, state.unread)
      }
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
