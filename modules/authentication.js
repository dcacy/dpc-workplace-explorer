'use strict';

var https = require('https');
var PropertiesReader = require('properties-reader');
//var properties = PropertiesReader('./workspace.properties');
var Promise = require('promise');
var request = require('request');
var rp = require('request-promise');

module.exports = function(app) {


	function getToken() {
		console.log('in method getToken');
		console.log('app id is ', process.env.WORKSPACE_APP_ID);
		return new Promise(function(resolve, reject){
			var options = {
			    method: 'POST',
			    uri: 'https://api.watsonwork.ibm.com/oauth/token',
			    auth: {
			    	user: process.env.WORKSPACE_APP_ID,
			    	pass: process.env.WORKSPACE_APP_SECRET
			    },
			    form: {
			        'grant_type': 'client_credentials'
			    }
			};
			rp(options)
	    .then(function (token) {
	        console.log('call to token worked and result is ', token);
	        resolve(token);
	    })
	    .catch(function (err) {
	        console.log('call to token failed: ', err.statusCode, err.message);
	        reject(err);
	    });
		});
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
			},
			function(err){
			console.log('error: ', err.statusCode, err.message);			
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
  	  console.log('expires: ', json.expires_in);
  	  console.log('session is', req.session);
  	  req.session.expires_in = 'howdy';
  		console.log('called getToken and result is ', json);
      res.setHeader('Content-Type','application/json');
//      var cookies = new Cookies(req, res);
//      cookies.set('expires_in', json.expires_in, { httpOnly: false });
  		res.end(JSON.stringify(result.data.spaces.items));
  	},
  	function(err){
  		console.log('error!', err.statusCode, err.message);
      res.setHeader('Content-Type','application/json');
  		res.end(JSON.stringify(err.message));
  	});
  });

}