const POSTS_DB_STORE_NAME = 'posts-store'
const POSTS_DB_TABLE_NAME = 'posts'
const POSTS_DB_KEY_PATH = 'id'

const idbPromise = idb.open(POSTS_DB_STORE_NAME, 1, db => {
  if (!db.objectStoreNames.contains(POSTS_DB_TABLE_NAME)) {
    db.createObjectStore(POSTS_DB_TABLE_NAME, { keyPath: POSTS_DB_KEY_PATH })
  }
})

const writeDataInIndexDB = (storeName, data) => {
  return idbPromise.then(db => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    store.put(data)
    return tx.complete
  })
}

const readDataFromIndexDB = storeName => {
  return idbPromise.then(db => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    return store.getAll()
  })
}

const clearStoreDataIndexDB = storeName => {
  return idbPromise.then(db => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    store.clear()
    return tx.complete // when ever we change data from store we need to return tx.complete to ensure that operation completes successfully
  })
}

const deleteItemFromIndexDB = (storeName, id) => {
  return idbPromise.then(db => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    store.delete(id)
    return tx.complete
  })
}
