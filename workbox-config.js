module.exports = {
  globDirectory: 'public/',
  globPatterns: ['**/*.{html,ico,json,css,png,jpg,js}'],
  ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
  swDest: 'public/sw.js',
  mode: 'development',
  cleanupOutdatedCaches: true
}
