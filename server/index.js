const firebase = require("firebase");

const secret = require("./.secret.js");

// Initialise Firebase
const app = firebase.initializeApp({
  apiKey: secret.firebaseApiKey,
  authDomain: "abc-news-169508.firebaseapp.com",
  databaseURL: "https://election-api.firebaseio.com",
  projectId: "abc-news-169508",
  storageBucket: "abc-news-169508.appspot.com",
  messagingSenderId: "767714403883"
});

const database = firebase.database();

const update = { test: "testing" };

database.ref("test").set(update);
