// Import scripts - third-party
importScripts('/src/js/idb.js')

// Import scripts - custom
importScripts('/src/js/utility.js')
importScripts('/src/test.js')

// cache keys vars
// const CACHE_VERSION = 'v10'
// const CACHE_VERSION = new Date().toISOString()
const STATIC_CACHE_KEY = `static-${CACHE_VERSION}`
const DYNAMIC_CACHE_KEY = `dynamic-${CACHE_VERSION}`
const OFFLINE_HTML_FILE = '/offline.html'

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE_KEY).then(cache => {
      // after cache.addAll
      cache.addAll([
        '/',
        '/index.html',
        OFFLINE_HTML_FILE,
        '/src/js/material.min.js',
        '/src/js/promise.js',
        '/src/js/fetch.js',
        '/src/js/app.js',
        '/src/js/feed.js',
        '/src/css/app.css',
        '/src/css/feed.css',
        '/src/images/main-image.jpg',
        'https://fonts.googleapis.com/css?family=Roboto:400,700',
        'https://fonts.googleapis.com/icon?family=Material+Icons',
        'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css'
      ])
    })
  )
})

// Activate event
self.addEventListener('activate', event => {
  // clear old caches
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== STATIC_CACHE_KEY && key !== DYNAMIC_CACHE_KEY) {
            return caches.delete(key)
          }
        })
      )
    })
  )
  return self.clients.claim()
})

// Cache-First__Then-Network (request made to both at same time and network response update old cache)
self.addEventListener('fetch', event => {
  if (!(event.request.url.indexOf('http') === 0)) return // skip the request. if request is not made with http protocol

  if (event.request.url.indexOf(urlToPostsApiGet) > -1) {
    event.respondWith(
      fetch(event.request).then(response => {
        const cloneRes = response.clone()
        // clearing complete table data before adding new one
        clearStoreDataIndexDB(POSTS_DB_TABLE_NAME)
          .then(() => {
            return cloneRes.json()
          })
          .then(data => {
            for (const key in data) {
              if (Object.hasOwnProperty.call(data, key)) {
                // writing data in indexedDB
                writeDataInIndexDB(POSTS_DB_TABLE_NAME, data[key])
                  .then(res => {
                    // console.log(
                    //   "[Service Worker]: sorting json data received from fetch request in indexedDB, res: ",
                    //   res
                    // );
                  })
                  .catch(err => {
                    console.error(
                      '[Service Worker]: ERROR while sorting json data received from fetch request in indexedDB, err: ',
                      err
                    )
                  })
              }
            }
          })
        return response
      })
    )
  } else {
    event.respondWith(
      caches.match(event.request).then(result => {
        if (result) {
          return result
        } else {
          return fetch(event.request)
            .then(response => {
              return caches.open(DYNAMIC_CACHE_KEY).then(cache => {
                // disabled because want to add save button on card
                cache.put(event.request.url, response.clone())
                return response
              })
            })
            .catch(err => {
              return caches.open(STATIC_CACHE_KEY).then(cache => {
                if (event.request.headers.get('accept').includes('text/html')) {
                  return cache.match(OFFLINE_HTML_FILE)
                }
              })
            })
        }
      })
    )
  }
})

// listen for background sync events
self.addEventListener('sync', event => {
  if (event.tag === SYNC_MANAGER_KEY_FOR_POST_SYNC) {
    event.waitUntil(
      readDataFromIndexDB(POSTS_SYNC_DB_TABLE_NAME)
        .then(data => {
          for (let i = 0; i < data.length; i++) {
            const post = data[i]
            sendDataToUrl(urlToPostsApiPost, post)
              .then(res => {
                console.log(
                  '[Service Worker], data send using sync manager, api res: ',
                  res
                )
                // delete data from local indexedDB
                deleteItemFromIndexDB(POSTS_SYNC_DB_TABLE_NAME, res.id).then(
                  res => {
                    console.log(
                      '[Service Worker], data deleted after sorting in server, res: ',
                      res
                    )
                  }
                )
              })
              .catch(err => {
                console.error(
                  '[Service Worker], ERROR OCCURED while sending data using sync manager, api err: ',
                  err
                )
              })
          }
        })
        .catch(err => {})
    )
  }
})

// listen for notification actions
// notification actions click listener
self.addEventListener('notificationclick', event => {
  const notification = event.notification
  const action = event.action
  console.log('[Service Worker] notificationclick event', {
    notification,
    action
  })
  if (action === 'cancel') {
    notification.close()
  } else {
    // other case is confirm (or if not buttons shown to user then simple click on notification)

    // open notification url
    event.waitUntil(
      clients.matchAll().then(allClients => {
        const activeClient = allClients.find(el => {
          return el.visibilityState === 'visible'
        })
        if (activeClient) {
          activeClient.navigate(notification.data.url)
          activeClient.focus()
        } else {
          activeClient.openWindow(notification.data.url)
        }
      })
    )
    notification.close()
  }
})
// notification "x" close action (or user close notification) listener
self.addEventListener('notificationclose', event => {
  const notification = event.notification

  console.log('[Service Worker] notificationclose event', {
    notification
  })
})

// listener for web push notifications
self.addEventListener('push', event => {
  console.log('[Service Worker] new web push notification event: ', event)

  let data = { title: 'NEW!', content: 'new new new :)(:' }

  if (event.data) {
    // payload send by push notification
    data = JSON.parse(event.data.text())
  }

  const options = {
    body: data.content,
    icon: '/src/images/icons/app-icon-96x96.png',
    badge: '/src/images/icons/app-icon-96x96.png',
    dir: 'ltr',
    lang: 'en-US',
    vibrate: [100, 50, 200],
    tag: 'pwa-web-push-notification', // tag to group notifications, new notification of this tag will go beneth top one
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
        icon: '/src/images/icons/app-icon-96x96.png'
      }
    ]
  }

  // show notification
  self.registration.showNotification(data.title, options)
})
