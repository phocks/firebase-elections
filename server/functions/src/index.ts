import * as functions from "firebase-functions";
// import { object } from "firebase-functions/lib/providers/storage";
const fs = require("fs");
const unzip = require("unzipper");
// var convert = require("xml-js");
const parser = require("fast-xml-parser");
const PromiseFtp = require("promise-ftp");
const ftp = new PromiseFtp();
const _ = require("underscore");
const path = require("path");
const util = require("util");

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require("firebase-admin");
admin.initializeApp({ databaseURL: "https://election-api.firebaseio.com" });

// Config
const ftpServer = "mediafeedarchive.aec.gov.au"; // mediafeed.aec.gov.au is real life FTP on the night
const directory = "/20499/Detailed/Verbose/";

// Globals
// let currentResults;

// Gets results and stores in currentResults
const getResults = async () => {
  // Connect to FTP server and log server message
  const serverMessage = await ftp.connect({ host: ftpServer });
  console.log(serverMessage);

  // Get directory listing
  const list = await ftp.list(directory);

  // Get a random election result
  // const zipFile = list[Math.floor(Math.random() * list.length)];

  // OR Get the latest election result
  const zipFile = list[list.length - 1]; // Latest

  const fileName = zipFile.name;
  console.log(fileName);
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
      console.log(filename);

      fs.readFile(
        "/tmp/extracted/xml/" + filename,
        "utf8",
        (err: any, data: any) => {
          // const json = convert.xml2js(data, {
          //   compact: true,
          //   trim: true,
          //   nativeType: true,
          //   nativeTypeAttributes: true
          // });

          // console.log(json);

          // const rawResults =
          //   json.MediaFeed.Results.Election[0].House.Analysis.National
          //     .TwoPartyPreferred.Coalition;

          // const results = rawResults.map((result: any) => {
          //   return {
          //     Id: result.CoalitionIdentifier._attributes.Id,
          //     ShortCode: result.CoalitionIdentifier._attributes.ShortCode,
          //     CoalitionName: result.CoalitionIdentifier.CoalitionName._text,
          //     Percentage: result.Votes._attributes.Percentage,
          //     Swing: result.Votes._attributes.Swing,
          //     Votes: result.Votes._text
          //   };
          // });

          // console.log(results);

          const jsonObj = parser.parse(data, {
            ignoreAttributes: false,
            parseAttributeValue: true
          });

          console.log(
            util.inspect(jsonObj, false, null, true /* enable colors */)
          );

          // admin
          //   .database()
          //   .ref("/test")
          //   .set({ results: results })
          //   .then(() => {
          //     console.log("Done...");
          //   });
        }
      );
    });
};

export const updateFromFtp = functions.https.onRequest((request, response) => {
  // Initial pull
  getResults();

  response.status(200).send("Ok");
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
  var files = fs.readdirSync(dir);

  // use underscore for max()
  return _.max(files, function(f: any) {
    var fullpath = path.join(dir, f);

    // ctime = creation time is used
    // replace with mtime for modification time
    return fs.statSync(fullpath).ctime;
  });
}
