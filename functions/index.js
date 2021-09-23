// Imports
const functions = require('firebase-functions')
const cors = require('cors')({ origin: true })
const webPush = require('web-push')
const admin = require('firebase-admin')
const formidable = require('formidable')
const UUID_V4 = require('uuid-v4')
const fs = require('fs')
const { Storage } = require('@google-cloud/storage')

// Creating Admin Connection
const serviceAccount = require('./pwa-firebase-keys.json')
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://pwa-cp-default-rtdb.firebaseio.com'
})

// Global Constants
const POSTS_TABLE = 'posts'
const SUBSCRIPTIONS_TABLE = 'subscriptions'

// web push package constants
const vapidPublicKey =
  'BPgkv9lvuQWaZKfcUMirrqmhy713qC3rFoo5tz2enFdRfbrdRPFXo4pSB0twS-yjMvRu_G4fqwvq0vcJQwtdGq0'
const vapidPrivateKey = 'wPPtBWDp6sFXMgAEYn4EzCAuREEUNPEPHDVqeLPoi2M'

// google cloud storage constants
const googleCloudStorageConfig = {
  projectId: 'pwa-cp',
  keyFilename: 'pwa-firebase-keys.json'
}

exports.storePostData = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    const uuid = UUID_V4()
    const formData = formidable.IncomingForm()
    const gcStorage = new Storage(googleCloudStorageConfig)
    formData.parse(request, (err, fields, files) => {
      if (err) {
        console.error(
          'Error Occured while parsing formData, formidable, err:',
          err
        )
        response.status(500).json({ error: err, message: err.message })
      } else {
        fs.rename(files.image.path, '/tmp/' + files.image.name)
        const bucket = gcStorage.bucket('pwa-cp.appspot.com')

        bucket.upload(
          '/tmp/' + files.image.name,
          {
            uploadType: 'media',
            metadata: {
              metadata: {
                contentType: files.image.type,
                firebaseStorageDownloadTokens: uuid
              }
            }
          },
          (err, uploadedFile) => {
            if (err) {
              console.error(
                'Error Occured while uploading file to bucket, err:',
                err
              )
              response.status(500).json({ error: err, message: err.message })
            } else {
              const { id, title, location } = fields
              const postData = {
                id,
                title,
                location,
                image: `https://firebasestorage.googleapis.com/v0/b/${
                  bucket.name
                }/o/${encodeURIComponent(
                  uploadedFile.name
                )}?alt=media&token=${uuid}`
              }
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
                    webPush
                      .sendNotification(pushConfig, pushData)
                      .catch(err => {
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
                  console.error(
                    'Error Occured while storing data in database, err:',
                    err
                  )
                  response
                    .status(500)
                    .json({ error: err, message: err.message })
                })
            }
          }
        )
      }
    })
  })
})
