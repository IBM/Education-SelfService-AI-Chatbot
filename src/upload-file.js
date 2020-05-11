
require('dotenv').config({path: '../.env'});
const fs = require('fs');
const DiscoveryV1 = require('ibm-watson/discovery/v1');
const { IamAuthenticator } = require('ibm-watson/auth');

const URL=process.env.DISCOVERY_URL;
const APIKEY=process.env.DISCOVERY_APIKEY;
const COLLECTION_ID=process.env.DISCOVERY_COLLECTION_ID;
const ENVIRONMENT_ID=process.env.DISCOVERY_ENVIRONMENT_ID;

const discovery = new DiscoveryV1({
  version: '2019-04-30',
  authenticator: new IamAuthenticator({
    apikey: APIKEY,
  }),
  url: URL,
});


const path = require('path');
//joining path of directory 
const directoryPath = '../data/manualdocs';
//passsing directoryPath and callback function
fs.readdir(directoryPath, function (err, files) {
    //handling error
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    } 
    //listing all files using forEach
    files.forEach(function (file) {
        // Do whatever you want to do with the file
        console.log("Uploading file: " + file); 
		const filePath = '../data/manualdocs/'+ file;
		
		const addDocumentParams = {
		  environmentId: ENVIRONMENT_ID,
		  collectionId: COLLECTION_ID,
		  file: fs.createReadStream(filePath),
		};

		discovery.addDocument(addDocumentParams)
		  .then(response => {
		    const documentAccepted = response.result;
		    console.log(JSON.stringify(documentAccepted, null, 2));
		  })
		  .catch(err => {
		    console.log('error:', err);
		  });
		
		
    });
});
console.log("Please wait for 5 minutes for IBM Watson Discovery to process the documents ......"); 

