import * as functions from "firebase-functions";
// import { object } from "firebase-functions/lib/providers/storage";
const fs = require("fs");
const unzip = require("unzipper");
const parser = require("fast-xml-parser");
const PromiseFtp = require("promise-ftp");
const ftp = new PromiseFtp();
const _ = require("underscore");
const path = require("path");
// const util = require("util");

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require("firebase-admin");
admin.initializeApp({ databaseURL: "https://election-api.firebaseio.com" });

// Get a reference to the Firebase database
const database = admin.database();

// Config
const ftpServer = "mediafeedarchive.aec.gov.au"; // mediafeed.aec.gov.au is real life FTP on the night
const directory = "/20499/Standard/Verbose/";

// Gets results and stores in currentResults
const getResults = async mainResponse => {
  // Connect to FTP server and log server message
  const serverMessage = await ftp.connect({ host: ftpServer });
  console.log("FTP: " + serverMessage);

  // Get directory listing
  const list = await ftp.list(directory);

  // Get a random election result
  // const zipFile = list[Math.floor(Math.random() * list.length)];

  // OR Get the latest election result
  // const zipFile = list[list.length - 1]; // Latest

  // OR use database to get file index
  const getFileIndex = async () => {
    const snapshot = await database.ref("/fileIndex").once("value");
    return snapshot.val();
  };

  const fileIndex = await getFileIndex();
  console.log("Current file index: " + fileIndex);
  const zipFile = list[fileIndex];
  const nextFileIndex = fileIndex > list.length ? 0 : fileIndex + 1;

  // Increment fileIndex on database
  database.ref("/fileIndex").set(nextFileIndex);

  // Download that file from FTP
  const fileName = zipFile.name;
  console.log("Downloading: " + fileName);
  const zipStream = await ftp.get(directory + fileName);

  // Write zip to disk
  await getStream(zipStream, "/tmp/data.zip");
  ftp.end(); // Close FTP connection

  // Unzip and copy xml file to results.xml
  fs.createReadStream("/tmp/data.zip")
    .pipe(unzip.Extract({ path: "/tmp/extracted/" }))
    .on("close", () => {
      console.log("Zip file extracted...");

      const filename = getMostRecentFileName("/tmp/extracted/xml/");
      console.log("XML file: " + filename);

      fs.readFile(
        "/tmp/extracted/xml/" + filename,
        "utf8",
        (err: any, data: any) => {
          if (err) {
            console.error(err);
            return;
          }

          const jsonObj = parser.parse(data, {
            attributeNamePrefix: "",
            textNodeName: "Value",
            ignoreAttributes: false,
            parseNodeValue: true,
            parseAttributeValue: true
          });

          // console.log(
          //   util.inspect(jsonObj, false, null, true /* enable colors */)
          // );

          const house = jsonObj.MediaFeed.Results.Election[0];
          const senate = jsonObj.MediaFeed.Results.Election[1];
          const nationalTwoPartyPreferred =
            jsonObj.MediaFeed.Results.Election[0].House.Analysis.National
              .TwoPartyPreferred;

          database
            .ref("/nationalTwoPartyPreferred")
            .set({ results: nationalTwoPartyPreferred })
            .then(() => {
              console.log("Database updated...");

              mainResponse.status(200).send("Ok");
            });
        }
      );
    });
};

// Main function definition
export const updateFromFtp = functions
  .runWith({ memory: "512MB", timeoutSeconds: 120 })
  .https.onRequest((request, response) => {
    // Initial pull
    getResults(response).catch(err => console.error(err));
  });

// Helper functions

// Writes a stream to filesystem
function getStream(stream: any, fileName: any) {
  return new Promise(function(resolve, reject) {
    stream.once("close", resolve);
    stream.once("error", reject);
    stream.pipe(fs.createWriteStream(fileName));
  });
}

// Return only base file name without dir
function getMostRecentFileName(dir: any) {
  const files = fs.readdirSync(dir);

  // use underscore for max()
  return _.max(files, function(f: any) {
    const fullpath = path.join(dir, f);

    // ctime = creation time is used
    // replace with mtime for modification time
    return fs.statSync(fullpath).ctime;
  });
}
