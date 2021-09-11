// Listen to SW events

// cache keys vars
const STATIC_CACHE_KEY = "static-v2";
const DYNAMIC_CACHE_KEY = "dynamic";
// const USER_REQUEST_CAHCE_KEY = 'user-requested-cache' // used in feed.js
const OFFLINE_HTML_FILE = "/offline.html";

// Install event
self.addEventListener("install", (event) => {
  // console.log('[Service Worker] sw installed event...', event)
  event.waitUntil(
    caches.open(STATIC_CACHE_KEY).then((cache) => {
      // Storing Static Files in Cache
      // before cache.addAll
      // cache.add('/')
      // cache.add('/index.html')
      // cache.add('/src/js/app.js')

      // after cache.addAll
      cache.addAll([
        "/",
        "/index.html",
        OFFLINE_HTML_FILE,
        "/src/js/material.min.js",
        "/src/js/promise.js",
        "/src/js/fetch.js",
        "/src/js/app.js",
        "/src/js/feed.js",
        "/src/css/app.css",
        "/src/css/feed.css",
        "/src/images/main-image.jpg",
        "https://fonts.googleapis.com/css?family=Roboto:400,700",
        "https://fonts.googleapis.com/icon?family=Material+Icons",
        "https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css",
      ]);
    })
  );
});

// Activate event
self.addEventListener("activate", (event) => {
  // console.log('[Service Worker] sw activated event...', event)

  // clear old caches
  event.waitUntil(
    caches.keys((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE_KEY && key !== DYNAMIC_CACHE_KEY) {
            console.log("[Service Worker] Remobing old cache...", key);
            return caches.delete(key);
          }
        })
      );
    })
  );

  return self.clients.claim();
});

// Fetch event
// self.addEventListener('fetch', event => {
//   // console.log('[Service Worker] fetching event...', event)
//   event.respondWith(
//     caches.match(event.request).then(result => {
//       if (result) {
//         return result
//       } else {
//         return fetch(event.request)
//           .then(response => {
//             return caches.open(DYNAMIC_CACHE_KEY).then(cache => {
//               // disabled because want to add save button on card
//               cache.put(event.request.url, response.clone())
//               return response
//             })
//           })
//           .catch(err => {
//             return caches.open(STATIC_CACHE_KEY).then(cache => {
//               return cache.match(OFFLINE_HTML_FILE)
//             })
//           })
//       }
//     })
//   )
// })

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
// self.addEventListener('fetch', event => {
//   // console.log('[Service Worker] fetching event...', event)
//   event.respondWith(
//     fetch(event.request)
//       .then(response => {
//         return caches.open(DYNAMIC_CACHE_KEY).then(cache => {
//           // disabled because want to add save button on card
//           cache.put(event.request.url, response.clone())
//           return response
//         })
//       })
//       .catch(err => {
//         return caches.match(event.request).then(result => {
//           if (result) {
//             return result
//           } else {
//             return caches.open(STATIC_CACHE_KEY).then(cache => {
//               return cache.match(OFFLINE_HTML_FILE)
//             })
//           }
//         })
//       })
//   )
// })

// Cache-First__Then-Network (request made to both at same time and network response update old cache)
self.addEventListener("fetch", (event) => {
  // console.log('[Service Worker] fetching event...', event)
  const postUrl = "https://httpbin.org/get";

  console.log(
    event.request.url,
    postUrl,
    event.request.url.indexOf(postUrl) > -1
  );

  if (event.request.url.indexOf(postUrl) > -1) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE_KEY).then((cache) => {
        // disabled because want to add save button on card
        return fetch(event.request).then((response) => {
          // trimCache(DYNAMIC_CACHE_KEY, 10) // if you want to trim cache
          cache.put(event.request.url, response.clone());
          return response;
        });
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((result) => {
        if (result) {
          return result;
        } else {
          return fetch(event.request)
            .then((response) => {
              return caches.open(DYNAMIC_CACHE_KEY).then((cache) => {
                // disabled because want to add save button on card
                cache.put(event.request.url, response.clone());
                // trimCache(DYNAMIC_CACHE_KEY, 10) // if you want to trim cache
                return response;
              });
            })
            .catch((err) => {
              return caches.open(STATIC_CACHE_KEY).then((cache) => {
                // if (event.request.url.indexOf('/help') > -1) { // because from help folder we are only importing one html file and it is not good to return html file if we request for a json/css data from server in that case just return null
                // return cache.match(OFFLINE_HTML_FILE);
                // } // i commented this because if user try to visit a invalid url we are showing error, so better to show our offline page, if you want to be specific here, just write a regex test to properly filtter unwanted urls

                // below if better version of above code as this will work as expected
                if (event.request.headers.get("accept").includes("text/html")) {
                  return cache.match(OFFLINE_HTML_FILE);
                }
              });
            });
        }
      })
    );
  }
});

const trimCache = (cacheName, maxItems) => {
  caches.open(cacheName).then((cache) => {
    return cache.keys().then((keys) => {
      if (keys.length > maxItems) {
        cache.delete(keys[0]).then((result) => {
          trimCache(cacheName, maxItems);
        });
      }
    });
  });
};
