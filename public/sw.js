// Import scripts - third-party
importScripts('/src/js/idb.js')

// Import scripts - custom
importScripts('/src/js/utility.js')

// cache keys vars
const CACHE_VERSION = 'v2'
const STATIC_CACHE_KEY = `static-${CACHE_VERSION}`
const DYNAMIC_CACHE_KEY = `dynamic-${CACHE_VERSION}`
const OFFLINE_HTML_FILE = '/offline.html'
const postUrl = 'https://pwa-cp-default-rtdb.firebaseio.com/posts.json'

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

  if (event.request.url.indexOf(postUrl) > -1) {
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
