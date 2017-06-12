"use strict";

var Cloudant = require("cloudant");
var Promise = require('promise');



// When not present in the system environment variables, dotenv will take them
// from the local file
require('dotenv').config({silent: true, path: 'local.env'});


// --------------------------------------------------------------------------
// Set up Cloudant
// --------------------------------------------------------------------------
// Initialize the library with my account.
var cloudant = Cloudant({vcapServices: JSON.parse(process.env.VCAP_SERVICES), plugin: 'promises'});
var cloudantdb;

var dbname = 'workspace_explorer';
exports.checkDB = function(dbname) {
 cloudantdb = getOrCreateDB(dbname)
	.then(function(db) {
		console.log('found database');
		cloudantdb = db;
	})
	.catch(function(err){
		console.log('error in getting db:', err);
	});
}
exports.checkDB(dbname);

exports.storeUserInfo = function(info){
	cloudantdb.get(info.userid)
	.then(function(results) {
		var doc = {
				'_id' : info.userid,
				'_rev': results._rev,
				'userName': info.userName,
				'refreshToken': info.refreshToken
		}
		cloudantdb.insert(doc, doc._id)
		.then(function(result){
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
	
	return new Promise(function(resolve, reject) {
	cloudantdb.get(userid)
		.then(function(results) {
			resolve(results);
		})
		.catch(function(err){
			console.log('error on looking up user', err);
			reject(err);
		});
	});
}


function getOrCreateDB(dbname) {

	return new Promise(function(resolve, reject) {
		
		cloudant.db.list().then(function(data){
			var foundIt = data.find(function(db){
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
				resolve(cloudant.db.use(dbname));
			}
		});
	});
}


function createDB(dbname){
	
	return new Promise(function(resolve, reject) {
		console.log('creating db');
		cloudant.db.create(dbname).then(function(data){
			console.log('result from create is', data);
			resolve(true);
		})
		.catch(function(err){
			console.log('error in create:', err);
			reject(false);
		});
	});
}
