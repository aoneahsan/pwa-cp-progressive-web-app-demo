// Import scripts - third-party
importScripts("/src/js/idb.js");

// Import scripts - custom
importScripts("/src/js/utility.js");

// cache keys vars
const CACHE_VERSION = "v2";
const STATIC_CACHE_KEY = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_KEY = `dynamic-${CACHE_VERSION}`;
const OFFLINE_HTML_FILE = "/offline.html";

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_KEY).then((cache) => {
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
  // clear old caches
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE_KEY && key !== DYNAMIC_CACHE_KEY) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Cache-First__Then-Network (request made to both at same time and network response update old cache)
self.addEventListener("fetch", (event) => {
  if (!(event.request.url.indexOf("http") === 0)) return; // skip the request. if request is not made with http protocol

  if (event.request.url.indexOf(urlToPostsApiGet) > -1) {
    event.respondWith(
      fetch(event.request).then((response) => {
        const cloneRes = response.clone();
        // clearing complete table data before adding new one
        clearStoreDataIndexDB(POSTS_DB_TABLE_NAME)
          .then(() => {
            return cloneRes.json();
          })
          .then((data) => {
            for (const key in data) {
              if (Object.hasOwnProperty.call(data, key)) {
                // writing data in indexedDB
                writeDataInIndexDB(POSTS_DB_TABLE_NAME, data[key])
                  .then((res) => {
                    // console.log(
                    //   "[Service Worker]: sorting json data received from fetch request in indexedDB, res: ",
                    //   res
                    // );
                  })
                  .catch((err) => {
                    console.error(
                      "[Service Worker]: ERROR while sorting json data received from fetch request in indexedDB, err: ",
                      err
                    );
                  });
              }
            }
          });
        return response;
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
                return response;
              });
            })
            .catch((err) => {
              return caches.open(STATIC_CACHE_KEY).then((cache) => {
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

// listen for background sync events
self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_MANAGER_KEY_FOR_POST_SYNC) {
    event.waitUntil(
      readDataFromIndexDB(POSTS_SYNC_DB_TABLE_NAME)
        .then((data) => {
          for (let i = 0; i < data.length; i++) {
            const post = data[i];
            sendDataToUrl(urlToPostsApiPost, post)
              .then((res) => {
                console.log(
                  "[Service Worker], data send using sync manager, api res: ",
                  res
                );
                // delete data from local indexedDB
                deleteItemFromIndexDB(POSTS_SYNC_DB_TABLE_NAME, res.id).then(
                  (res) => {
                    console.log(
                      "[Service Worker], data deleted after sorting in server, res: ",
                      res
                    );
                  }
                );
              })
              .catch((err) => {
                console.error(
                  "[Service Worker], ERROR OCCURED while sending data using sync manager, api err: ",
                  err
                );
              });
          }
        })
        .catch((err) => {})
    );
  }
});
