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
    center: true,
    resizable: true,
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
    await mainWindow.loadURL('app://./message/');
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/message`);
    mainWindow.webContents.openDevTools();
  }

  setTimeout(() => {
    // open all a link with external browser
    // https://github.com/electron/electron/issues/1344#issuecomment-359312676
    const shell = require('electron').shell;
    mainWindow.webContents.on('will-navigate', (event, url) => {
      event.preventDefault()
      if (url.startsWith('http:') || url.startsWith('https:')) {
        shell.openExternal(url)
      }
    });
  }, 5000)

})();

app.on('window-all-closed', () => {
  app.quit();
});
