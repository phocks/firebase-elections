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
const votesRef = database.ref(
  "test/results/Senate/Analysis/National/FirstPreferences/Total/Votes"
);
const fileIndexRef = database.ref("/fileIndex");
const nationalTwoPartPreferred = database.ref("/nationalTwoPartyPreferred");

const App = () => {
  const [results, setResults] = React.useState();
  const [updated, setUpdated] = React.useState("loading data...");
  const [progress, setProgress] = React.useState(0);

  // Component did mount
  React.useEffect(() => {
    console.log("Component mounted...");

    nationalTwoPartPreferred.on("value", snapshot => {
      const val = snapshot.val();
      console.log(val);

      setUpdated(val.Updated);
      setResults(val.results.Coalition);
    });

    fileIndexRef.on("value", snapshot => {
      setProgress(snapshot.val());
    });
  }, []);

  React.useEffect(() => {
    if (results) {
      const updatedElements = document.getElementsByClassName("data");
      for (let el of updatedElements) {
        el.className = "data highlighted";
      }

      setTimeout(() => {
        for (let el of updatedElements) {
          el.className = "data";
        }
      }, 1500);
    }
  });

  return (
    <div>
      <h2>
        National 2 party preferred as at:{" "}
        <span className="data">{updated}</span>
      </h2>

      {results &&
        results
          .map((result, iteration) => (
            <div className="result" key={iteration}>
              <h3>{result.CoalitionIdentifier.CoalitionName}</h3>
              <div>
                Votes: <span className="data">{result.Votes.Value}</span>
              </div>
              <div>
                Percentage:{" "}
                <span className="data">{result.Votes.Percentage}%</span>
              </div>
              <div>
                Swing: <span className="data">{result.Votes.Swing}</span>
              </div>
            </div>
          ))
          .reverse()}
      <p>
        *Archive election progress: <span className="data">{progress}</span> of
        3672
      </p>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById("app"));
