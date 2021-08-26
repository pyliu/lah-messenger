const path = require('path')
const notifier = require('node-notifier')

export default function (message, title, callback) {
    notifier.notify(
      {
        appID: '桃園地政-訊息通知',
        title: title || message,
        message: title ? message : '...',
        icon: path.join(__dirname, 'message.ico'), // Absolute path (doesn't work on balloons)
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
  