import { ipv4, ips } from '~/assets/js/ip.js'

const state = () => ({
  address: [ ...ips ],
  ip: ipv4
})

const getters = {
  ip: state => state.ip,
  address: state => state.address
}

// only sync operation
const mutations = {
  ip (state, ip) {
    state.ip = ip
  },
  address (state, address) {
    state.address = [ ...address ]
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
