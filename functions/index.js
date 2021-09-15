// Imports
const functions = require("firebase-functions");
const cors = require("cors")({ origin: true });
const admin = require("firebase-admin");

// Creating Admin Connection
const serviceAccount = require("./pwa-firebase-keys.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pwa-cp-default-rtdb.firebaseio.com",
});

// Global Constants
const POSTS_TABLE = "posts";

exports.storePostData = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    const { id, title, location, image } = request.body;
    const postData = { id, title, location, image };
    admin
      .database()
      .ref(POSTS_TABLE)
      .push(postData)
      .then((res) => {
        response.status(201).json({ message: "Data Stored.", id: id });
      })
      .catch((err) => {
        response.status(500).json({ error: err, message: err.message });
      });
  });
});
