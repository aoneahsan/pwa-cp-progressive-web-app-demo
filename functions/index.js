// Imports
const functions = require('firebase-functions')
const cors = require('cors')({ origin: true })
const webPush = require('web-push')
const admin = require('firebase-admin')

// Creating Admin Connection
const serviceAccount = require('./pwa-firebase-keys.json')
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://pwa-cp-default-rtdb.firebaseio.com'
})

// Global Constants
const POSTS_TABLE = 'posts'
const SUBSCRIPTIONS_TABLE = 'subscriptions'
const vapidPublicKey =
  'BPgkv9lvuQWaZKfcUMirrqmhy713qC3rFoo5tz2enFdRfbrdRPFXo4pSB0twS-yjMvRu_G4fqwvq0vcJQwtdGq0'
const vapidPrivateKey = 'wPPtBWDp6sFXMgAEYn4EzCAuREEUNPEPHDVqeLPoi2M'

exports.storePostData = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    const { id, title, location, image } = request.body
    const postData = { id, title, location, image }
    admin
      .database()
      .ref(POSTS_TABLE)
      .push(postData)
      .then(res => {
        return admin
          .database()
          .ref(SUBSCRIPTIONS_TABLE)
          .once('value')
      })
      .then(subScriptions => {
        // define webpush vapid details
        webPush.setVapidDetails(
          'mailto:aoneahsan@gmail.com',
          vapidPublicKey,
          vapidPrivateKey
        )

        // send web push notification to add subscriptions
        subScriptions.forEach(sub => {
          const pushConfig = sub.val()
          const pushData = JSON.stringify({
            title: 'Post Created!',
            content: 'New post created successfully.',
            url: 'http://localhost:8080/help'
          })
          webPush.sendNotification(pushConfig, pushData).catch(err => {
            console.error(
              '[Index.js] error while sending web push notification, err: ',
              err
            )
          })
        })

        // send response
        response.status(201).json({ message: 'Data Stored.', id: id })
      })
      .catch(err => {
        response.status(500).json({ error: err, message: err.message })
      })
  })
})
