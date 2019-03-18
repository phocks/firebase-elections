import * as React from "react";
import ReactDOM from "react-dom";

console.log("Hello ٩(●ᴗ●)۶");

// This import loads the firebase namespace along with all its type information.
import * as firebase from "firebase/app";

// These imports load individual services into the firebase namespace.
// import "firebase/auth";
import "firebase/database";

const secret = require(".secret.json");

// Initialize Firebase
const app = firebase.initializeApp({
  apiKey: secret.firebaseApiKey,
  authDomain: "abc-news-169508.firebaseapp.com",
  databaseURL: "https://election-api.firebaseio.com",
  projectId: "abc-news-169508",
  storageBucket: "abc-news-169508.appspot.com",
  messagingSenderId: "767714403883"
});

const database = firebase.database();

const testRef = database.ref("test");

const App = () => {
  const [votes, setVotes] = React.useState(0);

  React.useEffect(() => {
    console.log("Component mounted...");

    testRef.on("value", function(snapshot) {
      console.log(snapshot.val());
      setVotes(
        snapshot.val().results.Senate.Analysis.National.FirstPreferences.Total
          .Votes.Value
      );
    });
  }, []);

  return (
    <div>
      <h1>Votes: {votes}</h1>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById("app"));
