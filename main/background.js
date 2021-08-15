import { app, Tray, Menu } from 'electron'
import serve from 'electron-serve'
const path = require('path')
const url = require('url')

import {
  createWindow,
  exitOnChange,
} from './helpers'

const isProd = process.env.NODE_ENV === 'production'

const gotTheLock = app.requestSingleInstanceLock()

let mainWindow = null

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  // Create mainWindow, load the rest of the app, etc...
  app.on('ready', () => {
    (async () => {
      await app.whenReady()
      // tray icon
      const iconPath = path.join(__dirname, '../', 'resources/icon_g.ico')
      !isProd && console.log(`tray icon path`, iconPath)
      const tray = new Tray(iconPath)
      tray.setContextMenu(Menu.buildFromTemplate([{
          label: '顯示視窗', click () { mainWindow.show() }
        }, {
          label: '隱藏視窗', click () { mainWindow.hide() }
        }, {
          label: '關閉程式(您將無法收到通知)',
          click () {
            app.isQuiting = true
            app.quit()
          }
        }
      ]))
      tray.on('click', () => mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show())
      tray.on('double-click', () => mainWindow.show())
      tray.setToolTip('桃園地政通知即時通')

      mainWindow = createWindow('main',  {
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
        menuBarVisible: false,  // not working
      })
      // disable the menu bar since menuBarVisible flag does not work properly
      mainWindow.setMenuBarVisibility(false)
      mainWindow.once('ready-to-show', function(e) {
        setTimeout(() => this.show(), 5000)
      })

      mainWindow.on('focus', () => {
        // when browser window focused, set always on top attr to false
        mainWindow.setAlwaysOnTop(false)
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

      mainWindow.on('minimize', function(event) {
        event.preventDefault()
        mainWindow.hide()
      })
      
      mainWindow.on('close', function (event) {
        if (!app.isQuiting){
            event.preventDefault()
            mainWindow.hide()
        }
        return false
      })

    })()
  })
}

if (isProd) {
  serve({ directory: 'app' })
} else {
  exitOnChange()
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

app.on('window-all-closed', () => {
  // send to renderer process
  mainWindow.webContents.send('quit')
  app.quit()
})

// ipc main process to handle renderer request 
const { ipcMain } = require('electron')
ipcMain.handle('home-ready', async (event, arg) => {
  !isProd && console.log(`home.vue ready`, arg)
  mainWindow.show()
})
ipcMain.handle('title', async (event, str) => {
  !isProd && console.log(`Set Title`, str)
  mainWindow.setTitle(str)
})
ipcMain.handle('unread', async (event, channel) => {
  !isProd && console.log(`Set channel Unread`, channel)
  mainWindow.restore()
  // important notification
  if (mainWindow.userinfo.userid === channel || channel.startsWith('announcement')) {
    // mainWindow.center()
    mainWindow.setAlwaysOnTop(true)
  }
})
ipcMain.handle('userinfo', async (event, arg) => {
  const si = require('systeminformation')
  const found = [ ...await si.users() ].find(thisuser => !thisuser.user.startsWith('Admin') && !thisuser.user.startsWith('admin'))
  !isProd && console.log(`Found User`, found)
  /*
    found e.g. => {
      user: 'HB0000',
      tty: 'console',
      date: '',
      time: '',
      ip: '',
      command: ''
    }
   */
  const os = await si.osInfo()
  /*
    os e.g. => {
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
  const userinfo = {
    address: [],
    ipv4: '',
    ipv6: '',
    userid: found.user,
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
        userinfo.ipv4 = net.address
      } else if (net.family === 'IPv6' && !net.internal) {
        userinfo.ipv6 = net.address
      }
    }
  }

  // inject userinfo to main window
  mainWindow.userinfo = userinfo

  return userinfo
})
ipcMain.handle('ad-user-desc', async (event, config) => {
  const ActiveDirectory = require('activedirectory2').promiseWrapper
  // expect config: {
  //     url: `ldap://${this.adHost}`,
  //     baseDN: `DC=${this.domain.split('.').join(',DC=')}`, // 'DC=HB,DC=CENWEB,DC=LAND,DC=MOI'
  //     username: sAMAccountName,
  //     password: 'XXXXXXXXXXX'
  // }
  const ad = new ActiveDirectory(config)
  !isProd && console.log(`Query AD Config`, config)
  const user = await ad.findUser(config.username.split('@')[0])
  if (user) {
    !isProd && console.log(`found user`, user)
  } else {
    !isProd && console.error('AD query failed', user)
  }
  return user ? user.description : undefined
})
