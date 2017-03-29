'use strict';

//var https = require('https');
//var Promise = require('promise');
//var request = require('request');
//var rp = require('request-promise');
var Cloudant = require("cloudant");


module.exports = function(app) {

	var vcap_services = JSON.parse(process.env.VCAP_SERVICES);
	console.log('cloudant: typeof vcap is ', typeof process.env.VCAP_SERVICES); 
	console.dir(vcap_services);
//	console.log('cloudant id is ', vcap_services.cloudantNoSQLDB[0].credentials.username);
//	var CLOUDANT_USER = vcap_services.cloudantNoSQLDB[0].credentials.username;
//	var CLOUDANT_PW = vcap_services.cloudantNoSQLDB[0].credentials.password;
//	var cloudant = Cloudant({account: CLOUDANT_USER, password: CLOUDANT_PW});
//	console.log('cloudant is ', cloudant);
	
//	cloudant.db.list(function(err, allDbs) {
//    console.log('Checking cloudant by listing all my databases: %s', allDbs.join(', '));
//});
//	function getCloudant() {
//		console.log('in getCloudant');
//		console.log('cloudant id is ', process.CLOUDANT_USER = bluemix_env.cloudantNoSQLDB[0].credentials.username;
//    CLOUDANT_PW = bluemix_env.cloudantNoSQLDB[0].credentials.password)
//	}
	
	
//	function getSpaces() {
//		console.log('in method getSpaces');
//		return new Promise(function(resolve, reject){
//			getToken().then(function(result) {
//				console.log('token: ', result);
//				var token = JSON.parse(result);
//				var access_token = token.access_token;
//				console.log('getting Spaces');
//				var options = {
//				    method: 'POST',
//				    uri: 'https://api.watsonwork.ibm.com/graphql',
//				    headers: {
//				    	'Content-Type':'application/json',
//				    	'jwt': token.access_token
//				    },
//				    body: {
//				        query: 'query getSpaces { spaces(first: 5) {items {title id }}}'
//				    },
//				    json: true // Automatically stringifies the body to JSON
//				};
//				rp(options)
//		    .then(function (parsedBody) {
//		        console.log('graphql worked and result is ', parsedBody);
//		        resolve(parsedBody);
//		    })
//		    .catch(function (err) {
//		        console.log('graphql failed');
//		        reject(err);
//		    });
//			},
//			function(err){
//			console.log('error: ', err.statusCode, err.message);			
//			reject(err);
//			});			
//		});
//
//
//		}
//	
  app.get('/getCloudant', function(req,res) {
  	console.log('in getCloudant');
//  CLOUDANT_PW = bluemix_env.cloudantNoSQLDB[0].credentials.password)
  	res.end('done');
  });

}