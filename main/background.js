import { app } from 'electron';
import serve from 'electron-serve';
const path = require('path');

import {
  createWindow,
  exitOnChange,
} from './helpers';

const isProd = process.env.NODE_ENV === 'production';

const gotTheLock = app.requestSingleInstanceLock()

let mainWindow = null

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  })

  // Create mainWindow, load the rest of the app, etc...
  app.on('ready', () => {
    (async () => {
      await app.whenReady();

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
      });
      // disable the menu bar since menuBarVisible flag does not work properly
      mainWindow.setMenuBarVisibility(false);
      mainWindow.once('ready-to-show', function(e) {
        this.show();
      })

      if (isProd) {
        await mainWindow.loadURL('app://./home');
      } else {
        const port = process.argv[2];
        await mainWindow.loadURL(`http://localhost:${port}/home`);
        mainWindow.webContents.openDevTools();
      }

      // open all a link with external browser
      // https://github.com/electron/electron/issues/1344#issuecomment-359312676
      const shell = require('electron').shell;
      mainWindow.webContents.on('will-navigate', (event, url) => {
        if (!url.startsWith('http://localhost:8888')) {
          event.preventDefault()
          if (url.startsWith('http:') || url.startsWith('https:')) {
            shell.openExternal(url)
          }
        }
      });

    })();
  });
}

if (isProd) {
  serve({ directory: 'app' });
} else {
  exitOnChange();
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

app.on('window-all-closed', () => {
  // send to renderer process
  mainWindow.webContents.send('quit');
  app.quit();
});

// ipc main process to handle renderer request 
const { ipcMain } = require('electron')
ipcMain.handle('title', async (event, str) => {
  mainWindow.setTitle(str)
})
ipcMain.handle('unread', async (event, arg) => {
  mainWindow.restore()
  // mainWindow.center()
  mainWindow.moveTop()
})
ipcMain.handle('userinfo', async (event, arg) => {
  // console.log(arg)
  const si = require('systeminformation')
  /*
    command: ""
    date: ""
    ip: ""
    time: ""
    tty: "console"
    user: "0541"
   */
  const user = await si.users()
  /*
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
   */
  const os = await si.osInfo()
  const userinfo = {
    address: [],
    ipv4: '',
    ipv6: '',
    userid: user[0].user,
    hostname: os.hostname,
    domain: os.fqdn,
    os: os,
    user: user[0]
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
  return userinfo
})
