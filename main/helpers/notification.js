const path = require('path')
const notifier = require('node-notifier')
import debounce from 'lodash/debounce'

const isProd = process.env.NODE_ENV === 'production'

const notify = function (message, title, callback) {
  const iconPath = path.join(__dirname, 'message_notice.ico')
  !isProd && console.log(`notification icon path`, iconPath)
  notifier.notify(
    {
      appID: '💬桃園即時通',
      title: title || message,
      message: title ? message : '',
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

const notifyDebounced = debounce(notify, 5000)

export { notify, notifyDebounced }
  
