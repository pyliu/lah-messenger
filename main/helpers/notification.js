const path = require('path')
const notifier = require('node-notifier')
import debounce from 'lodash/debounce'

const isProd = process.env.NODE_ENV === 'production'

const iconPath = path.join(__dirname, 'bell.png')
!isProd && console.log(`notification icon path`, iconPath)

export {
  notifier,
  notify: function (message, title, callback) {
    notifier.notify(
      {
        appID: '💬桃園即時通',
        title: title || '通知',
        message: message || '[無訊息]',
        icon: iconPath, // Absolute path (doesn't work on balloons)
        sound: true, // Only Notification Center or Windows Toasters
        wait: true // Wait with callback, until user action is taken against notification, does not apply to Windows Toasters as they always wait or notify-send as it does not support the wait option
      },
      /*
        callback: function (err, response, metadata) {
          // Response is response from notification
          // Metadata contains activationType, activationAt, deliveredAt
        }
      */
      callback
    )
  }
  notifyDebounced: debounce(notify, 5000)
 }
  
