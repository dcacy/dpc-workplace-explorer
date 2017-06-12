


module.exports = function(app) {

	'use strict';

	var Promise = require('promise');
	var request = require('request');
	var rp = require('request-promise');
	var url = require('url');
	var bodyParser = require('body-parser');
	app.use(bodyParser.json());
	
		
	const WWS_URL = "https://api.watsonwork.ibm.com";
	const WWS_CLIENT_URL = "https://workspace.ibm.com";
	const AUTHORIZATION_API = "/oauth/token";
	const OAUTH_ENDPOINT = "/oauth/authorize";
	const SPACE_URI = "/space/";
	const sixtydays = 1000 * 60 * 60 * 24 * 60;
	const onehour = 1000 * 60 * 60;
	const APP_ID = process.env.WORKSPACE_APP_ID;
	const APP_SECRET = process.env.WORKSPACE_APP_SECRET;
	
	const vcap_application = JSON.parse(process.env.VCAP_APPLICATION);
	var APP_HOSTNAME = 'https://' + vcap_application.application_uris[0];

	app.get('/getMessageDetails', function(req,res) {
	  var qs = url.parse(req.url,true).query;
	  var messageID = qs.id;
	  var token = req.session.accessToken;
	  if ( typeof token === 'undefined' || token == 'undefined' ) {
	  	console.log('/getMessageDetails: no token');
	  	res.status(400);
	  	res.end('{"error":"Authentication token is not set."}');
	  } else if ( typeof messageID === undefined || messageID === '') {
	  	console.log('/getMessageDetails: no space ID provided');
	  	res.status(400);
	  	res.end('{"error":"You must provide a Message ID."}');
	  } else {
		  getMessageInfo(token, messageID)
		  .then(function(result){
		  	res.end(JSON.stringify(result));
		  })
		  .catch(function(err) {
		  	console.log(err.status, err.message);
		  	res.status(500);
		  	res.end('{"error":"status = ' + err.status + ', message = ' + err.message);
		  });
	  }
  	
  	
  });
	
	/**
	 * Execute a GraphQL query to get details about a single message.
	 * @params token {string} the oauth token for the session.
	 * @params messageID {string} the unique ID for the Watson Work message.
	 * @returns {object} a Promise which resolves to the JSON containing the message details.
	 */
	function getMessageInfo(token, messageID) {

		var query = 'query getMessage {'
		  + 'message(id: "' + messageID + '") {'
		  + '  id'
		  + '  content'
		  + '  contentType'
		  + '  annotations'
		  + '  createdBy {'
		  + '   displayName'
		  + '   email'
		  + '   photoUrl'
		  + '  }'
		  + ' }'
		  + '}'
		  ;

		return new Promise(function(resolve, reject){

				var options = {
				    method: 'POST',
				    uri: 'https://api.watsonwork.ibm.com/graphql',
				    headers: {
				    	'Content-Type':'application/json',
				    	'jwt': token
				    },
				    body: {
				        query: query
				    },
				    json: true // Automatically stringifies the body to JSON
				};
				rp(options)
		    .then(function(parsedBody) {
		        resolve(parsedBody.data.message);
		    })
		    .catch(function(err) {
		        console.log('graphql to get message info failed');
		        reject(err);
		    });
		});


	
	}


}