let tmp = ''
let all = []
// get all ip addresses by node.js os module 
const nets = require('os').networkInterfaces()
for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
    if (net.family === 'IPv4' && !net.internal) {
        tmp = net.address
        all.push(net.address)
    }
  }
}

export const ip = tmp
export const ips = all