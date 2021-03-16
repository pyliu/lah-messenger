import { app } from 'electron';
import serve from 'electron-serve';

import {
  createWindow,
  exitOnChange,
} from './helpers';

const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  serve({ directory: 'app' });
} else {
  exitOnChange();
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

(async () => {
  await app.whenReady();

  const mainWindow = createWindow('main', {
    width: isProd ? 480 : 960,
    height: 640,
    show: false,  // use 'ready-to-show' event to show the window
    useContentSize: false,
    menuBarVisible: false,
    center: true,
    resizable: false,
    maximizable: false,
    minimizable: true,
    alwaysOnTop: true,
    kiosk: false
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  if (isProd) {
    await mainWindow.loadURL('app://./home');
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
    mainWindow.webContents.openDevTools();
  }
})();

app.on('window-all-closed', () => {
  app.quit();
});
