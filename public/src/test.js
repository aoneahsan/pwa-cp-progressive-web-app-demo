// const CACHE_VERSION = 'test'
const CACHE_VERSION = new Date().getTime()
const cachesStorageTimeLimitInDays = 1
const timeToClearCache = cachesStorageTimeLimitInDays * 24 * 60 * 60
