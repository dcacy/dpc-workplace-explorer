'use strict';

var https = require('https');
var PropertiesReader = require('properties-reader');
var properties = PropertiesReader('./workspace.properties');
var Promise = require('promise');
var request = require('request');
var rp = require('request-promise');

module.exports = function(app) {


	function getToken() {
		console.log('in method getToken');
		return new Promise(function(resolve, reject){
			var options = {
			    hostname: 'api.watsonwork.ibm.com',
			    method: 'POST',
			    path: '/oauth/token',
			    headers: {
			      "Content-Type" : "application/x-www-form-urlencoded"
			    },
			    auth: properties.get('app_id') + ':' + properties.get('app_secret')
			};
			var result = '';
		  var request = https.request(options, function(response) {
		    console.log('made call to token; status is ', response.statusCode);
		    try {
		      response.on('data', function(chunk) {
		      	result += chunk;
		      });
		      response.on('end', function() {
		    	  console.log('got results from token');
//		    	  var tokenResponse;
//		    	  console.log(response);
		    	  resolve(result);
		      });
		    } catch (e) { console.log(e); }
		  }).on('error', function(e) { 
		  	console.log ("got error getting token ", e); 
		  	reject(e);
		  	});
	    request.write('grant_type=client_credentials');
	    request.end(result);
		});
//		return new Promise(function(resolve, reject) {
//      var req = https.get(url, function(res) {
//        var data = "";
//        res.on('data', function (chunk) {
//            data += chunk;
//        });
//        res.on('end', function() {
//            // resolve with the data returned by the Alchemy API
//            // do it this way so that the promise infrastructure will order it for us
//            resolve(data);
//        });
//    });
//    req.on('error', function (e) {
//        console.error(e);
//        reject(e);
//    });
//    req.end();
//}));
//		var options = {
//		    hostname: 'api.watsonwork.ibm.com',
//		    method: 'POST',
//		    path: '/oauth/token',
//		    headers: {
//		      "Content-Type" : "application/x-www-form-urlencoded"
//		    },
//		    auth: properties.get('app_id') + ':' + properties.get('app_secret')
//		};
		
//		var result = '';
//	  var request = https.request(options, function(response) {
//	    console.log('made call to token; status is ', response.statusCode);
//	    try {
//	      response.on('data', function(chunk) {
//	      	result += chunk;
//	      });
//	      response.on('end', function() {
//	    	  console.log('got results from token');
//	    	  var tokenResponse;
////	    	  console.log(response);
//	    	  callback(result);
//	      });
//	    } catch (e) { console.log(e); }
//	  }).on('error', function(e) { console.log ("got error, "); });
//    request.write('grant_type=client_credentials');
//    request.end(result);
	}
	
	
	function getSpaces() {
		console.log('in method getSpaces');
		return new Promise(function(resolve, reject){
			getToken().then(function(result) {
				console.log('token: ', result);
				var token = JSON.parse(result);
				var access_token = token.access_token;
				console.log('getting Spaces');
				var options = {
				    method: 'POST',
				    uri: 'https://api.watsonwork.ibm.com/graphql',
				    headers: {
				    	'Content-Type':'application/json',
				    	'jwt': token.access_token
				    },
				    body: {
				        query: 'query getSpaces { spaces(first: 5) {items {title id }}}'
				    },
				    json: true // Automatically stringifies the body to JSON
				};
				rp(options)
		    .then(function (parsedBody) {
		        console.log('graphql worked and result is ', parsedBody);
		        resolve(parsedBody);
		    })
		    .catch(function (err) {
		        console.log('graphql failed');
		        reject(err);
		    });
//				resolve(token);
			},
			function(err){
			console.log('error: ', err);			
			reject(err);
			});			
		});


		}
	
  app.get('/getToken', function(req,res) {
  	console.log('in getToken');
  	getSpaces().then(function(result) {
  		console.log('in getSpaces.then');
  	  var json = result;//JSON.parse(result);
  	  var expires_in = json.expires_in;
  		console.log('called getToken and result is ', json);
      res.setHeader('Content-Type','application/json');
//      var cookies = new Cookies(req, res);
//      cookies.set('expires_in', json.expires_in, { httpOnly: false });
  		res.end(JSON.stringify(result.data.spaces.items));
  	},
  	function(err){
  		console.log('error!', err);
      res.setHeader('Content-Type','application/json');
  		res.end(JSON.stringify(err));
  	});
  });

}