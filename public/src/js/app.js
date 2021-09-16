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
if (notificationsAvailableInWindow) {
  const displayConfirmationNotification = (
    message = 'Successfully Subscribed!'
  ) => {
    const options = {
      body: 'You successfully subscribed to our notifications service.',
      icon: '/src/images/icons/app-icon-96x96.png',
      badge: '/src/images/icons/app-icon-96x96.png',
      image: '/src/images/sf-boat.jpg',
      dir: 'ltr',
      lang: 'en-US',
      vibrate: [100, 50, 200],
      tag: 'pwa-app-notification', // tag to group notifications, new notification of this tag will go beneth top one
      renotify: true, // normally used together work "tag", as new notification will atleast vibrate phone again.
      actions: [
        {
          action: 'confirm', // id-of-notification
          title: 'Okay',
          icon: '/src/images/icons/app-icon-96x96.png'
        },
        {
          action: 'cancel',
          title: 'Cancel',
          icon: '/src/images/sf-boat.jpg'
        }
      ]
    }
    if (serviceWorkerAvailableInNavigator) {
      navigator.serviceWorker.ready.then(sw => {
        sw.showNotification(message, options)
      })
    } else {
      new Notification(message, options)
    }
  }

  const configurePushSubscription = () => {
    let serviceWorkerInstance
    if (!serviceWorkerAvailableInNavigator) {
      return
    } else {
      navigator.serviceWorker.ready
        .then(sw => {
          serviceWorkerInstance = sw
          return sw.pushManager.getSubscription()
        })
        .then(subscription => {
          if (subscription === null) {
            // create new subscription
            const vapidPublicKey =
              'BPgkv9lvuQWaZKfcUMirrqmhy713qC3rFoo5tz2enFdRfbrdRPFXo4pSB0twS-yjMvRu_G4fqwvq0vcJQwtdGq0'
            const convertedVapidPublicKey = urlBase64ToUint8Array(
              vapidPublicKey
            )
            return serviceWorkerInstance.pushManager
              .subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidPublicKey
              })
              .then(sub => {
                return { sub: sub, isNew: true }
              })
          } else {
            // use old subscription
            return { sub: subscription, isNew: false }
          }
        })
        .then(subData => {
          if (subData.isNew) {
            return fetch(urlToSubscriptionsApiPost, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
              },
              body: JSON.stringify(subData.sub)
            })
              .then(res => {
                return res.json()
              })
              .then(result => {
                return { apiRes: result, ...subData }
              })
          } else {
            return subData
          }
        })
        .then(subDataFinal => {
          console.log(
            '[App.js] subscription process completed successfully, subData: ',
            subDataFinal
          )
          displayConfirmationNotification(
            'Subscription Process Completed Successfully :)'
          )
        })
        .catch(err => {
          console.error(
            '[App.js] subscription process completed error, subData err: ',
            err
          )
        })
    }
  }

  const askForNotificationsPermissions = () => {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('Notification Permission granted.')
        configurePushSubscription()
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
