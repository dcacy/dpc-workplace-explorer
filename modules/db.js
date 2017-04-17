"use strict";

var Cloudant = require("cloudant");
var Promise = require('promise');


// --------------------------------------------------------------------------
// Setup global variables
// --------------------------------------------------------------------------

// Workspace API Setup - fixed stuff
//const WWS_URL = "https://api.watsonwork.ibm.com";
//const WWS_CLIENT_URL = "https://workspace.ibm.com";
//const AUTHORIZATION_API = "/oauth/token";
//const OAUTH_ENDPOINT = "/oauth/authorize";
//const SPACE_URI = "/space/";
//const sixtydays = 1000 * 60 * 60 * 24 * 60;
//const onehour = 1000 * 60 * 60;

//var WEBHOOK_VERIFICATION_TOKEN_HEADER = "X-OUTBOUND-TOKEN".toLowerCase();

// The Workspace App IDs
//var APP_ID;
//var APP_SECRET;

// cloudantNoSQLDB
//var CLOUDANT_USER;
//var CLOUDANT_PW;

// ICS Log Setup
//const LOG_APP = "IWWVerseToSpace";
//const LOG_FEATURE = "VerseToSpace";
//var LOG_DC;
//var LOG_AUTHOR;

// App config
//var APP_HOSTNAME;

// --------------------------------------------------------------------------
// Read environment variables
// --------------------------------------------------------------------------

// When not present in the system environment variables, dotenv will take them
// from the local file
require('dotenv').config({silent: true, path: 'local.env'});


// --------------------------------------------------------------------------
// Set up Cloudant
// --------------------------------------------------------------------------
// Initialize the library with my account.
//var cloudant = Cloudant({account: CLOUDANT_USER, password: CLOUDANT_PW, plugin: 'promises'});
var cloudant = Cloudant({vcapServices: JSON.parse(process.env.VCAP_SERVICES), plugin: 'promises'});
var cloudantdb;

var dbname = 'workspace_explorer';
exports.checkDB = function(dbname) {
 cloudantdb = getOrCreateDB(dbname)
	.then(function(db) {
		console.log('found database');
		cloudantdb = db;
//		return db;
	})
	.catch(function(err){
		console.log('error in getting db:', err);
	});
}
//console.log('calling exports.checkDB:', exports.checkDB(dbname));
exports.checkDB(dbname);
//console.log('cloudantdb is', cloudantdb);

//console.log('db is', cloudantdb);

exports.storeUserInfo = function(info){
	console.log('in storeUserInfo and info is', info);
//	console.log('first check to see if record exists');
//	console.log('dbname is', dbname);
//	console.log('and db is', cloudantdb);
//	var cloudantdb = cloudant.db.use(dbname);
	cloudantdb.get(info.userid)
	.then(function(results) {
//		console.log('result of check is', results);
//		console.log('updating record');
		var doc = {
				'_id' : info.userid,
				'_rev': results._rev,
				'userName': info.userName,
				'refreshToken': info.refreshToken
		}
		cloudantdb.insert(doc, doc._id)
		.then(function(result){
//			console.log('result of update', result);
		})
		.catch(function(err){
			console.log('error on update', err);
		});
	})
	.catch(function(err){
		console.log('error is', err);
		if ( err.statusCode == 404 ) {
			console.log('no record found, so inserting one...');
			var doc = {
					'_id' : info.userid,
					'userName': info.userName,
					'refreshToken': info.refreshToken
			}
			cloudantdb.insert(doc)
			.then(function(result) {
				console.log('insert successful', result);
			})
			.catch(function(err){
				console.log('error on insert', err);
			})
		} else {
			console.log('error checking for existing record', err);
		}
	});
}

exports.getRefreshToken = function(userid) {
	
//	console.log('looking up user in db');

	return new Promise(function(resolve, reject) {
	cloudantdb.get(userid)
		.then(function(results) {
//			console.log('found user:', results);
			resolve(results);
		})
		.catch(function(err){
			console.log('error on looking up user', err);
			reject(err);
		});
	});
}
//app.get('/testCloudant', function(req, res) {
//	res.end('done');
//});

function getOrCreateDB(dbname) {

	return new Promise(function(resolve, reject) {
		
	
	cloudant.db.list().then(function(data){
		var foundIt = data.find(function(db){
			//console.log('db is', db);
			return db === dbname;
		});
		if (!foundIt) { // undefined
			console.log('cannot find db', dbname);
			createDB()
			.then(function(){
				console.log('creation succeeded!');
				resolve(cloudant.db.use(dbname));
			})
			.catch(function(err){
				console.log('creation failed!');
				reject(err);
			});
		} else {
//			console.log('found db');
			resolve(cloudant.db.use(dbname));
		}
//		return cloudant.db.use(dbname);
	});
	});
}


	function createDB(dbname){
		
		return new Promise(function(resolve, reject) {
			console.log('creating db');
			cloudant.db.create(dbname).then(function(data){
				console.log('result from create is', data);
				resolve(true);
//				var cloudantdb = cloudant.db.use(dbname);
//				console.log('creating index');
//				var email_index = {name:'email_index', type:'json', index:{fields:['email']}};
//		    cloudantdb.index(email_index).then(function(response) {
//		    	console.log('result from indexing is', response);
//		    	resolve(true);
//		    })
//		    .catch(function(err){
//		    	console.log('error from index creation:', err);
//		    	reject(false);
//		    });
	//			 })
	//			 .catch(function(err){
	//				 console.log('error in insert:', err);
	//				 return false;
	//			 });
	
			})
			.catch(function(err){
				console.log('error in create:', err);
				reject(false);
			});
		});
	}


//}
//}