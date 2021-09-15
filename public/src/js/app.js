if (!window.Promise) {
  window.Promise = Promise
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(() => {
    console.log('[App.js] Service Worker registered.')
  })
}

// variable to store app install prompt event
let pwaInstallPromptEvent

// beforeinstallprompt event
// window.addEventListener('beforeinstallprompt', event => { // commented to avoid getting this again and again in development
//   pwaInstallPromptEvent = event
//   event.preventDefault()
//   return false
// })

// Check if Notifications available in window
const notificationsAvailableInWindow = 'Notification' in window
if (notificationsAvailableInWindow) {
  const askForNotificationsPermissions = () => {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('Notification Permission granted.')
      } else if (permission === 'denied') {
        console.log('Notification Permission denied.')
      } else {
        console.log('Notification Permission cancelled.')
      }
    })
  }

  const enableNotificationsButtons = document.querySelectorAll(
    '.enable-notifications'
  )
  for (let i = 0; i < enableNotificationsButtons.length; i++) {
    const btn = enableNotificationsButtons[i]

    // set display to inline-block
    btn.style.display = 'inline-block'

    // add click listener
    btn.addEventListener('click', askForNotificationsPermissions)
  }
}
