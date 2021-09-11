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
window.addEventListener('beforeinstallprompt', event => {
  pwaInstallPromptEvent = event
  event.preventDefault()
  return false
})
