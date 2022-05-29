import { app, Tray, Menu, nativeImage } from 'electron'
import serve from 'electron-serve'

const fs = require('fs')
const os = require('os');
const path = require('path')
const si = require('systeminformation')
const qs = require('qs')
const axios = require('axios')
// required for PHP backend
axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded'

import {
  createWindow,
  exitOnChange,
  notify,
  notifyDebounced
} from './helpers'

const isProd = process.env.NODE_ENV === 'production'

let mainWindow = null
let tray = null
let rendererReady = false

const closeApp = function () {
  tray && tray.destroy();
  app.isQuiting = true
  // send to renderer process
  mainWindow && mainWindow.webContents.send('quit')
  app.quit()
}

const gotTheLock = app.requestSingleInstanceLock()  // 鎖定視窗，並記錄回傳值
if (!gotTheLock) {
  // 開啟第二個視窗時無法成功鎖定，關閉視窗
  app.quit()
} else {
  // 開啟第二個視窗時觸發，將第一個視窗還原並關注
  // 此事件為第一個視窗發出
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      mainWindow.isMinimized() && mainWindow.restore()
      mainWindow.setAlwaysOnTop(true)
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // Create mainWindow, load the rest of the app, etc...
  app.on('ready', () => {
    (async () => {
      await app.whenReady()
      try {
        app.setLoginItemSettings({ openAtLogin: true })

        // tray icon
        let iconPath = path.join(__dirname, 'message.ico')
        !isProd && console.log(`tray icon path`, iconPath)
        const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
        tray = new Tray(trayIcon)
        // tray.setContextMenu(Menu.buildFromTemplate([{
        //     label: '顯示視窗', click () {
        //       mainWindow.show()
        //   }, icon: nativeImage.createFromPath(path.join(__dirname, 'maximize_window.ico')).resize({ width: 16, height: 16 })
        //   }, {
        //     label: '隱藏視窗', click () {
        //       mainWindow.hide()
        //   }, icon: nativeImage.createFromPath(path.join(__dirname, 'minimize_window.ico')).resize({ width: 16, height: 16 })
        //   }, {
        //     type: "separator"
        //   }
        //   ,{
        //     label: '關閉程式',
        //     click () {
        //       app.isQuiting = true
        //       app.quit()
        //     },
        //     icon: nativeImage.createFromPath(path.join(__dirname, 'close.ico')).resize({ width: 16, height: 16 })
        //   }
        // ]))
        tray.setIgnoreDoubleClickEvents(true)
        tray.on('click', (event) => {
          mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
        })
        tray.setToolTip('桃園即時通 v' + app.getVersion())

        mainWindow = createWindow('main', {
          width: isProd ? 490 : 960,
          height: 740,
          show: false,  // use 'ready-to-show' event to show the window
          useContentSize: true, // include window frame/menubar size
          center: true,
          resizable: false,
          maximizable: false,
          minimizable: true,
          alwaysOnTop: false,
          kiosk: false,
          icon: path.join(__dirname, 'message.ico'),
          menuBarVisible: false  // not working
        })
        // disable the menu bar since menuBarVisible flag does not work properly
        mainWindow.setMenuBarVisibility(false)
        
        mainWindow.once('ready-to-show', function(e) {
          // setTimeout(() => this.show(), 5000)
          // start as tray ... not showing up
          // mainWindow.show()
        })

        mainWindow.on('focus', () => {
          // when browser window focused, set always on top attr to false
          mainWindow.setAlwaysOnTop(false)
          // disable flash frame when forcused
          mainWindow.flashFrame(false)
        })

        if (isProd) {
          await mainWindow.loadURL('app://./home')
        } else {
          const port = process.argv[2]
          await mainWindow.loadURL(`http://localhost:${port}/home`)
          mainWindow.webContents.openDevTools()
        }

        // open all a link with external browser
        // https://github.com/electron/electron/issues/1344#issuecomment-359312676
        const shell = require('electron').shell
        mainWindow.webContents.on('will-navigate', (event, url) => {
          if (!url.startsWith('http://localhost:8888')) {
            event.preventDefault()
            if (url.startsWith('http:') || url.startsWith('https:')) {
              shell.openExternal(url)
            }
          }
        })

        // normal minimize action
        mainWindow.on('minimize', function(event) {
          event.preventDefault()
          mainWindow.webContents.send('set-current-channel', 'chat')
        })
        
        // close to tray
        mainWindow.on('close', function (event) {
          if (!app.isQuiting){
              event.preventDefault()
              mainWindow.hide()
              mainWindow.webContents.send('set-current-channel', 'chat')
          }
          return false
        })
      } catch (err) {
        closeApp()
        notify(err.message, '程式已關閉。')
      }
    })()
  })
}

if (isProd) {
  serve({ directory: 'app' })
} else {
  exitOnChange()
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

app.on('window-all-closed', closeApp)

/*
 * ipc main process to handle renderer request 
 */
const { ipcMain } = require('electron')

ipcMain.handle('reload', async (event, payload) => {
  if (isProd) {
    await mainWindow.loadURL('app://./home')
  } else {
    const port = process.argv[2]
    await mainWindow.loadURL(`http://localhost:${port}/home`)
  }
})

ipcMain.handle('add-ip-entry', async (event, payload) => {
  // get all possible ipv4 address
  const nets = require('os').networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        // update ip user mapping to API server
        payload.ip = net.address
        axios.post(
          payload.api,
          qs.stringify(payload)
        ).then(({ data }) => {
          data.status < 1 && !isProd && console.warn(data.message, payload.ip)
        }).catch(error => {
          console.error(error)
          notify(error.message, payload.ip)
        })
      }
    }
  }
})

ipcMain.handle('change-user-dept', async (event, payload) => {
  axios.post(
    payload.api,
    qs.stringify(payload)
  ).then(({ data }) => {
    data.status < 1 && !isProd && console.warn(data.message, payload.ip)
  }).catch(error => {
    console.error(error)
    notify(error.message, payload.ip)
  })
})

ipcMain.handle('wss-probe', async (event, payload) => {
  // https://www.npmjs.com/package/tcp-ping-sync
  const { probe } = require('tcp-ping-sync')
  return probe(
    payload.ip,   // (default: 'localhost')
    payload.port  // (default: 80)
  )
})

ipcMain.handle('show-window', async (event, payload) => {
  if (mainWindow) {
    mainWindow.isMinimized() && mainWindow.restore()
    mainWindow.show()
    payload.top && mainWindow.setAlwaysOnTop(true)
    payload.top && mainWindow.focus()
  }
})

ipcMain.handle('quit', async (event, str) => {
  app.isQuiting = true
  // send to renderer process
  mainWindow.webContents.send('quit')
  app.quit()
})

ipcMain.handle('home-ready', async (event, payload) => {
  !isProd && console.log(`home.vue ready`)
  rendererReady = true
})

ipcMain.handle('title', async (event, str) => {
  !isProd && console.log(`Set Title`, str)
  mainWindow.setTitle(str)
})

ipcMain.handle('notification', async (event, payload) => {
  const message = typeof payload === 'string' ? payload : payload.message
  const showMainWindow = payload.showMainWindow
  !isProd && console.log(`trigger notification`, payload)
  // to prevent multiple messages coming in at once
  notifyDebounced('[桃園即時通 💬]', message, (err, response, metadata) => {
    // Response is response from notification
    // Metadata contains activationType, activationAt, deliveredAt
    !isProd && console.warn(err, typeof response, metadata)
    // click the balloon shows the window
    if (!err && response !== 'timeout') {
      if (!mainWindow.isVisible()) {
        mainWindow.show()
        mainWindow.center()
      }
      mainWindow.setAlwaysOnTop(true)
      mainWindow.focus()
    }
    // 視窗置中顯示
    if (showMainWindow) {
      if (!mainWindow.isVisible()) {
        mainWindow.show()
        mainWindow.center()
      }
      mainWindow.setAlwaysOnTop(true)
      mainWindow.focus()
      // if (channel) {
      //   // 切換至頻道
      //   mainWindow.webContents.send('set-current-channel', channel)
      // }
    }
  })
})

ipcMain.handle('unread', async (event, channel) => {
  !isProd && console.log(`Set channel Unread`, channel)
  const annChannels = [`announcement_${mainWindow.userinfo?.userdept}`, 'announcement']
  // flash the window to catch attention
  mainWindow.flashFrame(true)
  // very important notification
  if (annChannels.includes(channel)) {
    mainWindow.show()
    mainWindow.center()
    mainWindow.setAlwaysOnTop(true)
    mainWindow.focus()
  }
})

ipcMain.handle('toggleUnreadTrayIcon', async (event, payload) => {
  !isProd && console.log(`change tray icon`, payload)
  let iconPath = path.join(__dirname, 'message.ico')
  if (payload.unread > 0) {
    // change ico to notice one
    iconPath = path.join(__dirname, 'message_notice.ico')
    tray.setToolTip('👉 您有' + payload.unread + '則未讀訊息！')
  } else {
    tray.setToolTip('桃園即時通 v' + app.getVersion())
  }
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  tray.setImage(trayIcon)
  // also update icon for the main window
  mainWindow.setIcon(iconPath)
})

ipcMain.handle('injectUserinfo', async (event, arg) => {  
  // inject userinfo to main window
  mainWindow.userinfo = arg
})

ipcMain.handle('userinfo', async (event, arg) => {
  // To find user id starts with 'HX'
  const found = [ ...await si.users() ].find(thisuser => /^H[A-H]/i.test(thisuser.user))
  /*
    expect found format => {
      user: 'HA0000',
      tty: 'console',
      date: '',
      time: '',
      ip: '',
      command: ''
    }
   */
  if (!isProd) {
    if (found) {
      console.log(`Found User`, found)
    } else {
      console.log(`Can not find user id that starts with H[A-H]`)
    }
  }
  const os = await si.osInfo()
  /*
    expect os format => {
      arch: "x64"
      build: "19042"
      codename: ""
      codepage: "950"
      distro: "Microsoft Windows 10"
      fqdn: "LAPTOP-LE2FFKSC"
      hostname: "LAPTOP-LE2FFKSC"
      hypervisor: false
      kernel: "10.0.19042"
      logofile: "windows"
      platform: "win32"
      release: "10.0.19042"
      remoteSession: false
      serial: "00000-00000-00000-xxxx"
      servicepack: "0.0"
      uefi: false
    }
   */
  !isProd && console.log('collected OS info', os)
  const userinfo = {
    address: [],
    ipv4: '',
    ipv6: '',
    userid: found ? found.user : '',
    hostname: os.hostname,
    domain: os.fqdn,
    os: os,
    user: found,
    dns: require('dns').getServers()
  }
  // get all ip addresses by node.js os module 
  const nets = require('os').networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      userinfo.address.push(net.address)
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        if (net.address.startsWith('192.168.') || net.address.startsWith('220.1.')) {
          userinfo.ipv4 = net.address
        }
      } else if (net.family === 'IPv6' && !net.internal) {
        userinfo.ipv6 = net.address
      }
    }
  }

  return userinfo
})

ipcMain.handle('ad-user-query', async (event, config) => {
  if (!isProd) {
    return {
      description: '測試中',
      group: 'inf'
    }
  }
  const ActiveDirectory = require('activedirectory2').promiseWrapper
  // expect config: {
  //     url: `ldap://${this.adHost}`,
  //     baseDN: `DC=${this.domain.split('.').join(',DC=')}`, // 'DC=HB,DC=CENWEB,DC=LAND,DC=MOI'
  //     username: sAMAccountName,
  //     password: 'XXXXXXXXXXX'
  // }
  const ad = new ActiveDirectory(config)
  !isProd && console.log(`查詢AD設定檔`, config)
  const user = await ad.findUser(config.username.split('@')[0])
  if (user) {
    !isProd && console.log(`找到AD使用者`, user)
    // find user group
    let group = 'adm'
    let checked = false
    await ad.isUserMemberOf(config.username, '資訊課') && (group = 'inf') && (checked = true)
    !checked && await ad.isUserMemberOf(config.username, '登記課') && (group = 'reg') && (checked = true)
    !checked && await ad.isUserMemberOf(config.username, '地價課') && (group = 'val') && (checked = true)
    !checked && await ad.isUserMemberOf(config.username, '行政課') && (group = 'adm') && (checked = true)
    !checked && await ad.isUserMemberOf(config.username, '測量課') && (group = 'sur') && (checked = true)
    !checked && await ad.isUserMemberOf(config.username, '人事室') && (group = 'hr') && (checked = true)
    !checked && await ad.isUserMemberOf(config.username, '會計室') && (group = 'acc') && (checked = true)
    // await ad.isUserMemberOf(config.username, '秘書室') && (group = 'supervisor') && (checked = true)
    // await ad.isUserMemberOf(config.username, '主任室') && (group = 'supervisor') && (checked = true)
    return {
      description: user.description,
      group: group
    }
  } else {
    !isProd && console.error('AD查詢失敗', user)
  }
  return undefined
})

ipcMain.handle('open-explorer', async (event, payload) => {
  // open the path
  require('child_process').exec(`start "" "${payload.path || payload}"`)
})

ipcMain.handle('open-image', async (event, payload) => {
  const parts = payload.src?.split(',')
  let buf, tmpFilename
  if (Array.isArray(parts)) {
    //check extension
    switch (parts[0]) {
      case "data:image/jpeg;base64":
        tmpFilename = "tmp.jpeg"
        break
      case "data:image/png;base64":
        tmpFilename = "tmp.png"
        break
      default:
        // for most cases
        tmpFilename = 'tmp.jpg'
    }
    buf = Buffer.from(parts[1], 'base64')
  } else {
    buf = Buffer.from(payload.src, 'base64')
  }
  const filepath = path.join(os.homedir(), tmpFilename)
  fs.writeFile(filepath, buf, (error) => {
    if (error) { throw new Error(error) }
    // open the image
    require('child_process').exec(filepath, function(err, stdout, stderr) {
      if (err !== null) {
        console.error(err)
        throw err
      }
    })
  })
})

ipcMain.handle('version', async (event, payload) => {
  const version = app.getVersion()
  !isProd && console.log(`APP version is`, version)
  return version
})
