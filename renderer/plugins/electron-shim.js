/**
 * Electron to Tauri IPC Shim & Adapter
 *
 * 為 Nuxt 2 / Vue 2 前端提供與 Electron ipcRenderer 100% 相容之 API，
 * 內部自動偵測執行環境：
 * - 當於 Tauri (window.__TAURI__) 環境時，透明映射至 Tauri v2 的 invoke 與 listen
 * - 當於 Electron 環境時，透明穿透至原生 Electron ipcRenderer
 * - 當於一般瀏覽器環境時，提供安全 Mock 降級回傳，避免頁面崩潰
 */

let tauriCore = null;
let tauriEvent = null;

// 動態安全載入 Tauri API
const getTauri = async () => {
  if (tauriCore && tauriEvent) return { core: tauriCore, event: tauriEvent };
  if (typeof window !== 'undefined' && window.__TAURI__) {
    tauriCore = window.__TAURI__.core;
    tauriEvent = window.__TAURI__.event;
    return { core: tauriCore, event: tauriEvent };
  }
  return null;
};

// 頻道名稱對應映射表 (Electron channel -> Tauri command)
const CHANNEL_TO_COMMAND = {
  'version': 'get_version',
  'userinfo': 'get_userinfo',
  'ad-user-query': 'ad_user_query',
  'change-user-dept': 'change_user_dept',
  'add-ip-entry': 'add_ip_entry',
  'open-explorer': 'open_explorer',
  'open-image': 'open_image',
  'show-window': 'show_window',
  'show-message-box': 'show_message_box',
  'notification': 'send_notification',
  'flash-frame': 'flash_frame',
  'reload': 'reload_window',
  'quit': 'quit_app',
  'home-ready': 'home_ready',
  'title': 'set_title',
  'toggleUnreadTrayIcon': 'toggle_unread_tray_icon',
  'unread': 'home_ready',
  'injectUserinfo': 'home_ready'
};

const listenersMap = new Map();

export const ipcRenderer = {
  async invoke(channel, payload) {
    // 1. 若處於原生 Electron 環境
    if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
      try {
        const electron = window.require ? window.require('electron') : null;
        if (electron && electron.ipcRenderer) {
          return await electron.ipcRenderer.invoke(channel, payload);
        }
      } catch (e) {
        // Fall through
      }
    }

    // 2. 若處於 Tauri 環境
    const tauri = await getTauri();
    if (tauri && tauri.core) {
      const command = CHANNEL_TO_COMMAND[channel] || channel.replace(/-/g, '_');

      // 參數適配調整
      let args = {};
      if (channel === 'title') {
        args = { title: payload || '' };
      } else if (channel === 'open-explorer') {
        args = { path: typeof payload === 'string' ? payload : (payload && payload.path ? payload.path : '') };
      } else if (channel === 'ad-user-query') {
        args = { config: payload };
      } else if (channel === 'flash-frame') {
        const flag = (payload && typeof payload === 'object') ? payload.flag : payload;
        args = { flag: flag !== false };
      } else if (payload !== undefined && payload !== null) {
        if (typeof payload === 'object' && !Array.isArray(payload)) {
          args = { ...payload, payload };
        } else {
          args = { payload };
        }
      }

      try {
        return await tauri.core.invoke(command, args);
      } catch (err) {
        console.error(`[Tauri IPC Error] ${command}:`, err);
        throw err;
      }
    }

    // 3. 瀏覽器端 Mock 降級
    console.warn(`[IPC Shim Mock] ${channel}`, payload);
    if (channel === 'version') return '1.6.0 (Tauri Mode)';
    if (channel === 'userinfo') {
      return {
        ip: '127.0.0.1',
        ipv4: '127.0.0.1',
        userid: 'TEST_USER',
        realname: '測試使用者',
        pcname: 'DEV-PC',
        hostname: 'DEV-PC',
        os: 'Windows 10 / Mock',
        dns: ['192.168.10.1']
      };
    }
    if (channel === 'ad-user-query') {
      return { description: '測試使用者', group: 'inf' };
    }
    return null;
  },

  async on(channel, listener) {
    if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
      try {
        const electron = window.require ? window.require('electron') : null;
        if (electron && electron.ipcRenderer) {
          return electron.ipcRenderer.on(channel, listener);
        }
      } catch (e) {}
    }

    const tauri = await getTauri();
    if (tauri && tauri.event) {
      const unlisten = await tauri.event.listen(channel, (event) => {
        listener(null, event.payload);
      });
      listenersMap.set(listener, unlisten);
      return;
    }

    // 網頁端掛載至 window 自訂事件
    if (typeof window !== 'undefined') {
      const handler = (e) => listener(null, e.detail);
      window.addEventListener(`tauri-${channel}`, handler);
      listenersMap.set(listener, handler);
    }
  },

  off(channel, listener) {
    const unlisten = listenersMap.get(listener);
    if (unlisten) {
      if (typeof unlisten === 'function') unlisten();
      else if (typeof window !== 'undefined') window.removeEventListener(`tauri-${channel}`, unlisten);
      listenersMap.delete(listener);
    }
  }
};

export const clipboard = {
  writeText(text) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      return navigator.clipboard.writeText(text);
    }
    return Promise.resolve();
  }
};

export const shell = {
  openExternal(url) {
    if (!url) return Promise.resolve();
    return ipcRenderer.invoke('open-explorer', { path: url }).catch((err) => {
      console.warn('[shell.openExternal fallback to window.open]', err);
      if (typeof window !== 'undefined') {
        window.open(url, '_blank');
      }
    });
  }
};

// 注入至全域 window，相容 window.require('electron') 與 window.ipcRenderer
if (typeof window !== 'undefined') {
  window.ipcRenderer = ipcRenderer;
  window.electron = { ipcRenderer, clipboard, shell };
  const origRequire = window.require;
  window.require = function(mod) {
    if (mod === 'electron') {
      return { ipcRenderer, clipboard, shell };
    }
    if (typeof origRequire === 'function') {
      return origRequire(mod);
    }
    return null;
  };
}

export default {
  ipcRenderer,
  clipboard,
  shell
};
