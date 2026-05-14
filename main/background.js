'use strict';

import ActiveDirectory from 'activedirectory2';
import axios from 'axios';
import { app, dialog, ipcMain, Menu, nativeImage, shell, Tray } from 'electron';
import serve from 'electron-serve';
import fs from 'fs/promises';
import { debounce, isEmpty } from 'lodash';
import os from 'os';
import path from 'path';
import qs from 'qs';
import si from 'systeminformation';
import { createWindow, exitOnChange, notify } from './helpers';

// --- 全域變數與設定 ---
const isProd = process.env.NODE_ENV === 'production';
axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';

let mainWindow = null;
let tray = null;

// --- 應用程式生命週期管理 ---

/**
 * 處理應用程式關閉邏輯
 */
const closeApp = () => {
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
  }
  app.isQuiting = true;
  if (mainWindow) {
    mainWindow.webContents.send('quit');
  }
  app.quit();
};

/**
 * 初始化系統匣 (Tray)
 */
const initializeTray = () => {
  try {
    const iconPath = path.join(__dirname, 'message.ico');
    const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray = new Tray(trayIcon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '顯示視窗',
        click: () => mainWindow?.show(),
        icon: nativeImage.createFromPath(path.join(__dirname, 'maximize_window.ico')).resize({ width: 16, height: 16 })
      },
      {
        label: '隱藏視窗',
        click: () => mainWindow?.hide(),
        icon: nativeImage.createFromPath(path.join(__dirname, 'minimize_window.ico')).resize({ width: 16, height: 16 })
      },
      { type: "separator" },
      {
        label: '關閉即時通',
        click: closeApp,
        icon: nativeImage.createFromPath(path.join(__dirname, 'close.ico')).resize({ width: 16, height: 16 })
      }
    ]);

    tray.setContextMenu(contextMenu);
    tray.setToolTip(`${process.env.APP || '桃園即時通'} v${app.getVersion()}`);
    tray.on('click', () => {
      if (mainWindow) {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
      }
    });
  } catch (error) {
    handleError(error, 'Tray Initialization Failed');
  }
};

/**
 * 初始化主視窗
 */
const initializeMainWindow = async () => {
  mainWindow = createWindow('main', {
    width: isProd ? 490 : 960,
    height: 740,
    show: false,
    useContentSize: true,
    center: true,
    resizable: false,
    maximizable: false,
    icon: path.join(__dirname, 'message.ico'),
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('focus', () => {
    mainWindow.setAlwaysOnTop(false);
    mainWindow.flashFrame(false);
  });

  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
    mainWindow.webContents.send('set-current-channel', 'chat');
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
      mainWindow.webContents.send('set-current-channel', 'chat');
    }
  });
  
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('app://') && !url.startsWith('http://localhost')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  
  if (isProd) {
    await mainWindow.loadURL('app://./home');
    // 生產模式下已關閉自動開啟 DevTools 功能 (F12 仍可手動開啟，若 home.vue 有綁定)
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
    // 開發模式下保持開啟 DevTools 以利除錯
    mainWindow.webContents.openDevTools();
  }
};

/**
 * 應用程式啟動準備
 */
const onAppReady = async () => {
  try {
    await app.whenReady();
    app.setLoginItemSettings({ openAtLogin: true });

    initializeTray();
    await initializeMainWindow();

  } catch (error) {
    handleError(error, 'App Ready Failed', true);
  }
};

// --- 單例與生命週期 ---
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
  app.on('ready', onAppReady);
}

app.on('window-all-closed', closeApp);

if (isProd) {
  serve({ directory: 'app' });
} else {
  exitOnChange();
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

// --- 通用輔助函式 ---

const handleError = (error, context, forceQuit = false) => {
  console.error(`[${context}]`, error);
  if (isProd) {
    notify('發生錯誤', `情境: ${context}\n${error.message}`);
  }
  if (forceQuit) {
    closeApp();
  }
};

const postApiData = async (payload) => {
  try {
    const { data } = await axios.post(payload.api, qs.stringify(payload));
    return data;
  } catch (error) {
    handleError(error, `API Post to ${payload.api}`);
    return null;
  }
};

const notifyDebounced = debounce((message, payload) => {
  notify(`[${process?.env.APP || '桃園即時通' } 💬]`, message, (err, response) => {
    if (err) return;
    if (response !== 'timeout') {
      if (mainWindow) {
        if (!mainWindow.isVisible()) mainWindow.show();
        mainWindow.focus();
      }
    }
  });
  if (mainWindow) {
    mainWindow.show();
    mainWindow.flashFrame(true);
  }
}, 300, { 'leading': true, 'trailing': false });

// --- IPC 事件處理器 ---

ipcMain.handle('reload', async () => {
  try {
    if (isProd) await mainWindow.loadURL('app://./home');
    else await mainWindow.loadURL(`http://localhost:${process.argv[2]}/home`);
  } catch(e) {
    handleError(e, 'Reload Window');
  }
});

ipcMain.handle('add-ip-entry', (event, payload) => {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        postApiData({ ...payload, ip: net.address });
      }
    }
  }
});

ipcMain.handle('change-user-dept', (event, payload) => postApiData(payload));

ipcMain.handle('show-window', (event, payload) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    if (payload.top) {
      mainWindow.setAlwaysOnTop(true);
      mainWindow.focus();
    }
  }
});

ipcMain.handle('show-message-box', (event, arg) => {
  const options = { type: 'info', title: '📢 訊息', message: '請輸入訊息', ...arg };
  if (options.browser) {
    const combined = isEmpty(options.detail) ? options.message : `${options.message} - ${options.detail}`;
    mainWindow.webContents.send('in-browser-notify', {
      message: combined, type: options.type, title: options.title, statusOnly: options.statusOnly
    });
  } else {
    dialog.showMessageBox(options.block ? mainWindow : null, options);
  }
});

ipcMain.handle('quit', closeApp);

ipcMain.handle('home-ready', () => {
  if (!isProd) console.log('Renderer process is ready.');
});

/**
 * 設定視窗標題
 * 排除 undefined 或 null 字串，維持標題穩定
 */
ipcMain.handle('title', (event, str) => {
  if (mainWindow && str && String(str).toLowerCase() !== 'undefined' && String(str).toLowerCase() !== 'null') {
    mainWindow.setTitle(String(str));
  }
});

ipcMain.handle('notification', (event, payload) => {
  const message = typeof payload === 'string' ? payload : payload.message;
  notifyDebounced(message, payload);
});

/**
 * [FIX] 補回遺漏的 unread 處理器
 * 解決 console 報錯 "No handler registered for 'unread'"
 */
ipcMain.handle('unread', (event, channel) => {
  if (!isProd) {
    console.log(`Channel marked as unread:`, channel);
  }
  // 核心閃爍邏輯已移至 toggleUnreadTrayIcon 統一管理，此處僅作為 API 相容性保留
});

/**
 * 根據未讀計數更新圖示與閃爍
 * 
 * [FIX] 移除 mainWindow.setIcon()，改以 setOverlayIcon() 取代。
 * 
 * 根因：setIcon() 底層呼叫 Win32 WM_SETICON，會觸發 DWM 重算非客戶區尺寸，
 *       與 useContentSize: true 產生衝突，導致視窗短暫膨脹。
 *       視窗圖示已於 initializeMainWindow() 設定，無需於此動態變更。
 */
ipcMain.handle('toggleUnreadTrayIcon', (event, payload) => {
  try {
    let iconName = 'message.ico';
    let toolTip = `${process.env.APP || '桃園即時通'} v${app.getVersion()}`;

    if (payload.unread > 0) {
      iconName = 'message_notice.ico';
      toolTip = `👉 您有 ${payload.unread} 則未讀訊息！`;
      mainWindow && mainWindow.show();
      mainWindow && mainWindow.flashFrame(true);
    } else {
      mainWindow && mainWindow.flashFrame(false);
    }

    const iconPath = path.join(__dirname, iconName);
    const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });

    if (tray && !tray.isDestroyed()) {
      tray.setImage(trayIcon);
      tray.setToolTip(toolTip);
    }

    // [FIX] 移除以下這行，它是視窗尺寸跳動的根本原因：
    // if (mainWindow) mainWindow.setIcon(iconPath); ← 已刪除

    // [FIX] 改用 setOverlayIcon() 在工作列按鈕疊加通知徽章（符合 Windows UX 規範）
    //       有未讀時顯示紅點，無未讀時清除（傳入 null）。
    if (mainWindow) {
      if (payload.unread > 0) {
        const overlayIcon = nativeImage.createFromPath(
          path.join(__dirname, 'message_notice.ico')
        ).resize({ width: 16, height: 16 });
        mainWindow.setOverlayIcon(overlayIcon, `${payload.unread} 則未讀訊息`);
      } else {
        mainWindow.setOverlayIcon(null, '');
      }
    }

  } catch (error) {
    handleError(error, 'ToggleUnreadTrayIcon');
  }
});

ipcMain.handle('injectUserinfo', (event, arg) => {  
  if (mainWindow) mainWindow.userinfo = arg;
});

/**
 * 收集並回傳本機使用者與系統資訊
 * 包含 IP 優先排序邏輯：192.168.10.x ~ 192.168.89.x，第 3 碼越小越優先
 */
ipcMain.handle('userinfo', async () => {
  try {
    const [siUsers, osInfo, nets] = await Promise.all([
      si.users(),
      si.osInfo(),
      os.networkInterfaces()
    ]);
    const foundUser = siUsers.find(u => /^H[A-H]/i.test(u.user));
    
    const userinfo = {
      ip: '', ipv4: '', userid: foundUser ? foundUser.user : '',
      pcname: osInfo.hostname, hostname: osInfo.hostname,
      os: `${osInfo.distro} ${osInfo.release}`,
      dns: require('dns').getServers()
    };
    
    const availableIps = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          availableIps.push(net.address);
        }
      }
    }

    const prioritizedIps = availableIps
      .filter(addr => {
        const parts = addr.split('.');
        if (parts.length === 4 && parts[0] === '192' && parts[1] === '168') {
          const seg3 = parseInt(parts[2], 10);
          return seg3 >= 10 && seg3 <= 89;
        }
        return false;
      })
      .sort((a, b) => {
        const seg3A = parseInt(a.split('.')[2], 10);
        const seg3B = parseInt(b.split('.')[2], 10);
        return seg3A - seg3B;
      });

    const finalIp = prioritizedIps[0] || availableIps[0] || '';
    userinfo.ipv4 = finalIp;
    userinfo.ip = finalIp;
    
    return userinfo;
  } catch(e) {
    handleError(e, 'userinfo collection');
    return null;
  }
});

ipcMain.handle('ad-user-query', async (event, config) => {
  if (!isProd) return { description: '測試使用者', group: 'inf' };
  try {
    const ad = new ActiveDirectory.promiseWrapper(config);
    const sAMAccountName = config.username.split('@')[0];
    const user = await ad.findUser(sAMAccountName);
    if (!user) throw new Error(`User ${sAMAccountName} not found.`);
    const groupMap = new Map([['資訊課', 'inf'],['登記課', 'reg'],['地價課', 'val'],['行政課', 'adm'],['測量課', 'sur'],['人事室', 'hr'],['會計室', 'acc']]);
    let group = 'hr'; 
    for (const [groupName, groupCode] of groupMap.entries()) {
      if (await ad.isUserMemberOf(config.username, groupName)) { group = groupCode; break; }
    }
    return { description: user.description, group };
  } catch (error) {
    handleError(error, 'AD User Query');
    return null;
  }
});

ipcMain.handle('open-explorer', (event, payload) => {
  const targetPath = payload.path || payload;
  shell.openPath(targetPath).catch(err => handleError(err, `Open Explorer: ${targetPath}`));
});

ipcMain.handle('open-image', async (event, payload) => {
  try {
    const parts = payload.src?.split(',');
    if (!Array.isArray(parts) || parts.length !== 2) throw new Error('Invalid Base64 source.');
    const mimeType = parts[0];
    const base64Data = parts[1];
    let extension = '.jpg';
    if (mimeType.includes('png')) extension = '.png';
    else if (mimeType.includes('jpeg')) extension = '.jpeg';
    const buffer = Buffer.from(base64Data, 'base64');
    const filepath = path.join(app.getPath('temp'), `image_preview_${Date.now()}${extension}`);
    await fs.writeFile(filepath, buffer);
    await shell.openPath(filepath);
  } catch (error) {
    handleError(error, 'Open Image');
  }
});

ipcMain.handle('version', () => app.getVersion());
