// Listen to SW events

// cache keys vars
const STATIC_CACHE_KEY = 'static-v2'
const DYNAMIC_CACHE_KEY = 'dynamic'
const USER_REQUEST_CAHCE_KEY = 'user-requested-cache' // used in feed.js
const OFFLINE_HTML_FILE = '/offline.html'

// Install event
self.addEventListener('install', event => {
  // console.log('[Service Worker] sw installed event...', event)
  event.waitUntil(
    caches.open(STATIC_CACHE_KEY).then(cache => {
      // Storing Static Files in Cache
      // before cache.addAll
      // cache.add('/')
      // cache.add('/index.html')
      // cache.add('/src/js/app.js')

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
  // console.log('[Service Worker] sw activated event...', event)

  // clear old caches
  event.waitUntil(
    caches.keys(keys => {
      return Promise.all(
        keys.map(key => {
          if (
            key !== STATIC_CACHE_KEY &&
            key !== DYNAMIC_CACHE_KEY &&
            key !== USER_REQUEST_CAHCE_KEY
          ) {
            console.log('[Service Worker] Remobing old cache...', key)
            return caches.delete(key)
          }
        })
      )
    })
  )

  return self.clients.claim()
})

// Fetch event
self.addEventListener('fetch', event => {
  // console.log('[Service Worker] fetching event...', event)
  event.respondWith(
    caches.match(event.request).then(result => {
      if (result) {
        return result
      } else {
        return fetch(event.request)
          .then(response => {
            return caches.open(DYNAMIC_CACHE_KEY).then(cache => {
              // disabled because want to add save button on card
              cache.put(event.request.url, res.clone())
              return response
            })
          })
          .catch(err => {
            return caches.open(STATIC_CACHE_KEY).then(cache => {
              return cache.match(OFFLINE_HTML_FILE)
            })
          })
      }
    })
  )
})

// Cache-Only
// self.addEventListener('fetch', event => {
//   // console.log('[Service Worker] fetching event...', event)
//   event.respondWith(caches.match(event.request))
// })

// Network-Only
// self.addEventListener('fetch', event => {
//   // console.log('[Service Worker] fetching event...', event)
//   event.respondWith(fetch(event.request))
// })

// Network-First__Then-Cahce
self.addEventListener('fetch', event => {
  // console.log('[Service Worker] fetching event...', event)
  event.respondWith(
    fetch(event.request)
      .then(response => {
        return caches.open(DYNAMIC_CACHE_KEY).then(cache => {
          // disabled because want to add save button on card
          cache.put(event.request.url, res.clone())
          return response
        })
      })
      .catch(err => {
        caches.match(event.request).then(result => {
          if (result) {
            return result
          } else {
            return caches.open(STATIC_CACHE_KEY).then(cache => {
              return cache.match(OFFLINE_HTML_FILE)
            })
          }
        })
      })
  )
})
