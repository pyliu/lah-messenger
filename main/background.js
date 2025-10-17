'use strict';

import ActiveDirectory from 'activedirectory2';
import axios from 'axios';
import { app, dialog, ipcMain, Menu, nativeImage, shell, Tray } from 'electron';
import serve from 'electron-serve';
import fs from 'fs/promises'; // 使用 fs 的 promise 版本
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
    tray.setToolTip(`${process.env.APP|| '桃園即時通'} v${app.getVersion()}`);
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
 * @returns {Promise<void>}
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

  mainWindow.once('ready-to-show', () => {
    // 初始不顯示，保持在系統匣
    // mainWindow.show();
  });

  // --- 主視窗事件綁定 ---
  mainWindow.on('focus', () => {
    mainWindow.setAlwaysOnTop(false);
    // 當使用者點擊視窗時，停止閃爍
    mainWindow.flashFrame(false);
  });

  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide(); // 改為隱藏到系統匣
    mainWindow.webContents.send('set-current-channel', 'chat');
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
      mainWindow.webContents.send('set-current-channel', 'chat');
    }
  });
  
  // 開啟外部連結
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // 確保只攔截非本地開發的 URL
    if (!url.startsWith('app://') && !url.startsWith('http://localhost')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  
  if (isProd) {
    await mainWindow.loadURL('app://./home');
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
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
    handleError(error, 'App Ready Failed', true); // 啟動失敗，直接關閉
  }
};

// --- 單例應用程式邏輯 ---
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

  // --- 綁定應用程式生命週期事件 ---
  app.on('ready', onAppReady);
}

app.on('window-all-closed', closeApp);

if (isProd) {
  serve({ directory: 'app' });
} else {
  exitOnChange();
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

// --- 共用輔助函式 ---

/**
 * 統一的錯誤處理函式
 * @param {Error} error - 錯誤物件
 * @param {string} context - 錯誤發生的情境
 * @param {boolean} [forceQuit=false] - 是否強制關閉應用程式
 */
const handleError = (error, context, forceQuit = false) => {
  console.error(`[${context}]`, error);
  if (isProd) {
    notify('發生錯誤', `情境: ${context}\n${error.message}`);
  }
  if (forceQuit) {
    closeApp();
  }
};

/**
 * 封裝 API POST 請求
 * @param {object} payload - 要傳送的資料
 * @returns {Promise<object|null>}
 */
const postApiData = async (payload) => {
  try {
    const { data } = await axios.post(payload.api, qs.stringify(payload));
    if (data.status < 1 && !isProd) {
      console.warn(data.message, payload);
    }
    return data;
  } catch (error) {
    handleError(error, `API Post to ${payload.api}`);
    return null;
  }
};

/**
 * 防抖動的通知函式
 */
const notifyDebounced = debounce((message, payload) => {
  notify(`[${process?.env.APP || '桃園即時通' } 💬]`, message, (err, response) => {
    if (err) {
      handleError(err, 'Notification Display');
      return;
    }
    
    // 使用者點擊通知
    if (response !== 'timeout') {
      if (mainWindow) {
        if (!mainWindow.isVisible()) mainWindow.show();
        mainWindow.setAlwaysOnTop(true);
        mainWindow.focus();
      }
    }
  });
  
  if (mainWindow && !mainWindow.isFocused()) {
    mainWindow.flashFrame(true);
  }
}, 300, { 'leading': true, 'trailing': false }); // 立即觸發，300ms 內不再觸發


// --- IPC 事件處理器 ---

/**
 * 重新載入主視窗
 */
ipcMain.handle('reload', async () => {
  try {
    if (isProd) {
      await mainWindow.loadURL('app://./home');
    } else {
      const port = process.argv[2];
      await mainWindow.loadURL(`http://localhost:${port}/home`);
    }
  } catch(e) {
    handleError(e, 'Reload Window');
  }
});

/**
 * 新增 IP 登錄
 */
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

/**
 * 變更使用者部門
 */
ipcMain.handle('change-user-dept', (event, payload) => postApiData(payload));

/**
 * 顯示主視窗
 */
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

/**
 * 顯示訊息框
 */
ipcMain.handle('show-message-box', (event, arg) => {
  const options = {
    type: 'info',
    title: '📢 訊息',
    message: '請輸入訊息',
    ...arg
  };

  if (options.browser) {
    const combined = isEmpty(options.detail) ? options.message : `${options.message} - ${options.detail}`;
    mainWindow.webContents.send('in-browser-notify', {
      message: combined,
      type: options.type,
      title: options.title,
      statusOnly: options.statusOnly
    });
  } else {
    dialog.showMessageBox(options.block ? mainWindow : null, options);
  }
});

/**
 * 關閉應用程式
 */
ipcMain.handle('quit', closeApp);

/**
 * 處理渲染程序已就緒的事件
 */
ipcMain.handle('home-ready', () => {
  if (!isProd) {
    console.log('Renderer process is ready.');
  }
  // 這個處理器目前僅用於確認事件，未來可擴充
});

/**
 * 設定視窗標題
 */
ipcMain.handle('title', (event, str) => {
  if (mainWindow) {
    mainWindow.setTitle(str);
  }
});

/**
 * 處理來自渲染程序地通知請求
 */
ipcMain.handle('notification', (event, payload) => {
  const message = typeof payload === 'string' ? payload : payload.message;
  notifyDebounced(message, payload);
});

/**
 * 處理未讀頻道事件 (僅用於日誌記錄)
 * @description 此處的邏輯已被簡化。原有的 flashFrame(true) 已被移除，
 * 以統一由 toggleUnreadTrayIcon 根據未讀總數來控制視窗閃爍，避免邏輯衝突。
 */
ipcMain.handle('unread', (event, channel) => {
  if (!isProd) {
    console.log(`Channel marked as unread:`, channel);
  }
  // 此處不再處理視窗閃爍，交由 toggleUnreadTrayIcon 統一管理
});

/**
 * 根據未讀訊息總數更新系統匣圖示和視窗閃爍狀態
 * @description 這是控制視窗閃爍的主要邏輯點。
 */
ipcMain.handle('toggleUnreadTrayIcon', (event, payload) => {
  try {
    let iconName = 'message.ico';
    let toolTip = `${process.env.APP|| '桃園即時通'} v${app.getVersion()}`;

    // 當有未讀訊息時
    if (payload.unread > 0) {
      iconName = 'message_notice.ico';
      toolTip = `👉 您有 ${payload.unread} 則未讀訊息！`;
      // 僅在視窗本身非焦點狀態時才閃爍，避免干擾使用者
      if (mainWindow && !mainWindow.isFocused()) {
        mainWindow.flashFrame(true);
      }
    } else { // 當沒有未讀訊息時
      if (mainWindow) {
        // 停止閃爍
        mainWindow.flashFrame(false);
      }
    }

    const iconPath = path.join(__dirname, iconName);
    const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    
    if (tray && !tray.isDestroyed()) {
      tray.setImage(trayIcon);
      tray.setToolTip(toolTip);
    }
    if (mainWindow) {
      mainWindow.setIcon(iconPath);
    }
  } catch (error) {
    handleError(error, 'ToggleUnreadTrayIcon');
  }
});

/**
 * 注入使用者資訊到主視窗物件
 */
ipcMain.handle('injectUserinfo', (event, arg) => {  
  if (mainWindow) {
    mainWindow.userinfo = arg;
  }
});

/**
 * 收集並回傳本機使用者與系統資訊
 */
ipcMain.handle('userinfo', async () => {
  try {
    const [siUsers, osInfo, nets] = await Promise.all([
      si.users(),
      si.osInfo(),
      os.networkInterfaces()
    ]);
    
    // 尋找符合格式的登入者ID (H 開頭)
    const foundUser = siUsers.find(u => /^H[A-H]/i.test(u.user));
    
    const userinfo = {
      ipv4: '',
      userid: foundUser ? foundUser.user : '',
      hostname: osInfo.hostname,
      os: `${osInfo.distro} ${osInfo.release}`,
      dns: require('dns').getServers()
    };
    
    // 遍歷網卡資訊找尋 IPv4
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          userinfo.ipv4 = net.address;
          // 找到主要IP後即可跳出
          break;
        }
      }
      if (userinfo.ipv4) break;
    }
    
    return userinfo;
  } catch(e) {
    handleError(e, 'userinfo collection');
    return null;
  }
});

/**
 * 查詢 Active Directory 使用者資訊
 */
ipcMain.handle('ad-user-query', async (event, config) => {
  if (!isProd) {
    return { description: '測試使用者', group: 'inf' };
  }
  try {
    const ad = new ActiveDirectory.promiseWrapper(config);
    const sAMAccountName = config.username.split('@')[0];
    const user = await ad.findUser(sAMAccountName);

    if (!user) {
      throw new Error(`User ${sAMAccountName} not found in AD.`);
    }

    // 使用 Map 讓部門對應更清晰且易於擴充
    const groupMap = new Map([
      ['資訊課', 'inf'],
      ['登記課', 'reg'],
      ['地價課', 'val'],
      ['行政課', 'adm'],
      ['測量課', 'sur'],
      ['人事室', 'hr'],
      ['會計室', 'acc'],
    ]);

    let group = 'adm'; // 預設群組
    for (const [groupName, groupCode] of groupMap.entries()) {
      if (await ad.isUserMemberOf(config.username, groupName)) {
        group = groupCode;
        break;
      }
    }

    return { description: user.description, group };
  } catch (error) {
    handleError(error, 'AD User Query');
    return null;
  }
});

/**
 * 使用系統預設程式開啟檔案總管路徑
 */
ipcMain.handle('open-explorer', (event, payload) => {
  const targetPath = payload.path || payload;
  shell.openPath(targetPath).catch(err => handleError(err, `Open Explorer: ${targetPath}`));
});

/**
 * 開啟 Base64 編碼的圖片
 */
ipcMain.handle('open-image', async (event, payload) => {
  try {
    const parts = payload.src?.split(',');
    if (!Array.isArray(parts) || parts.length !== 2) {
      throw new Error('Invalid Base64 image source.');
    }

    const mimeType = parts[0];
    const base64Data = parts[1];
    let extension = '.jpg';
    if (mimeType.includes('png')) extension = '.png';
    if (mimeType.includes('jpeg')) extension = '.jpeg';

    const buffer = Buffer.from(base64Data, 'base64');
    // 使用應用程式暫存目錄與唯一檔名，避免衝突
    const tempDir = app.getPath('temp');
    const filepath = path.join(tempDir, `image_preview_${Date.now()}${extension}`);
    
    await fs.writeFile(filepath, buffer);
    // 使用 shell.openPath 更安全
    await shell.openPath(filepath);
    
    // 注意：暫存檔不會自動刪除，但因為在 temp 目錄，通常系統會定期清理
  } catch (error) {
    handleError(error, 'Open Image');
  }
});

/**
 * 取得應用程式版本號
 */
ipcMain.handle('version', () => app.getVersion());
