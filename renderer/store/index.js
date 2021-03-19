const logerror = (error) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error(error.response.data)
    console.error(error.response.status)
    console.error(error.response.headers)
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    console.error(error.request)
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error('Error', error.message)
  }
  console.error(error.config)
}

const timestamp = () => {
  // e.g. 2020-12-03 10:23:00
  const now = new Date()
  return now.getFullYear() + '-' +
    ('0' + (now.getMonth() + 1)).slice(-2) + '-' +
    ('0' + now.getDate()).slice(-2) + ' ' +
    ('0' + now.getHours()).slice(-2) + ':' +
    ('0' + now.getMinutes()).slice(-2) + ':' +
    ('0' + now.getSeconds()).slice(-2)
}

const logtimestamp = (message) => {
  const ts = timestamp()
  console.log(`${ts} ${message}`)
}

const state = () => ({
  address: [],
  ip: '0.0.0.0'
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
      // get all ip addresses by node.js os module 
      const nets = require('os').networkInterfaces()
      const results = []
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
          if (net.family === 'IPv4' && !net.internal) {
            results.push(net.address)
          }
        }
      }
      commit('address', results)
      if (results.length > 0) {
        commit('ip', results[results.length - 1])
      }
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
