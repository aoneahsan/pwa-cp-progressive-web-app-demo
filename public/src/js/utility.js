// Global Consts
const urlToPostsApiGet = 'https://pwa-cp-default-rtdb.firebaseio.com/posts.json'
const urlToPostsApiPost =
  'https://us-central1-pwa-cp.cloudfunctions.net/storePostData'
const urlToSubscriptionsApiPost =
  'https://pwa-cp-default-rtdb.firebaseio.com/subscriptions.json'
const serviceWorkerAvailableInNavigator = 'serviceWorker' in navigator

// indexedDb Keys
const INDEXED_DB_VERSION = 3
const POSTS_DB_STORE_NAME = 'posts-store'
const POSTS_DB_TABLE_NAME = 'posts'
const POSTS_SYNC_DB_TABLE_NAME = 'sync-posts'
// table key to store and check cache time limit
const CACHE_TIME_LIMIT_TABLE_KEY = 'cache-time-limit'
const TABLES_ARRAY = [
  POSTS_DB_TABLE_NAME,
  POSTS_SYNC_DB_TABLE_NAME,
  CACHE_TIME_LIMIT_TABLE_KEY
]
const TABLE_KEY_PATH = 'id'

// sync manager keys, used for post background sync event tag
const SYNC_MANAGER_KEY_FOR_POST_SYNC = 'sync-new-post'

// indexedDB cache table item ID
const CACHE_TABLE_ITEM_ID = 'cache-item-id'

const idbPromise = idb.open(POSTS_DB_STORE_NAME, INDEXED_DB_VERSION, db => {
  for (let i = 0; i < TABLES_ARRAY.length; i++) {
    const table = TABLES_ARRAY[i]
    console.log('[Utility.js] creating indexedDb table: ' + table)
    if (!db.objectStoreNames.contains(table)) {
      db.createObjectStore(table, { keyPath: TABLE_KEY_PATH })
    }
  }
})

// idbPromise.then(db => {
//   console.log('[Utility.js] db', db)
// })

const writeDataInIndexDB = async (storeName, data) => {
  return idbPromise.then(db => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    store.put(data)
    return tx.complete
  })
}

const readDataFromIndexDB = async storeName => {
  return idbPromise.then(db => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    return store.getAll()
  })
}

const clearStoreDataIndexDB = async storeName => {
  return idbPromise.then(db => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    store.clear()
    return tx.complete // when ever we change data from store we need to return tx.complete to ensure that operation completes successfully
  })
}

const deleteItemFromIndexDB = async (storeName, id) => {
  return idbPromise.then(db => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    store.delete(id)
    return tx.complete
  })
}

// APIs functions
const sendDataToUrl = async (url, data) => {
  return fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  }).then(res => {
    return res.json()
  })
}

const urlBase64ToUint8Array = base64String => {
  var padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  var base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')

  var rawData = window.atob(base64)
  var outputArray = new Uint8Array(rawData.length)

  for (var i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function dataURItoBlob (dataURI) {
  var byteString = atob(dataURI.split(',')[1])
  var mimeString = dataURI
    .split(',')[0]
    .split(':')[1]
    .split(';')[0]
  var ab = new ArrayBuffer(byteString.length)
  var ia = new Uint8Array(ab)
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  var blob = new Blob([ab], { type: mimeString })
  return blob
}
