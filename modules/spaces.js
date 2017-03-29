'use strict';

var https = require('https');

module.exports = function(app) {

	function testAuth() {
		return authentication.getToken();
	}

	function getSpaces(callback) {
		console.log('in method getToken');
		var options = {
		    hostname: 'api.watsonwork.ibm.com',
		    method: 'POST',
		    path: '/graphql',
//		    headers: {
//		      "Content-Type" : "application/x-www-form-urlencoded"
//		    },
		    auth: '3b7bc12c-da5d-46d3-a7e1-51c7e8b6295d:nsn6tep1ixsp3ss681c2huol2ryvkyaa'
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
	    	  var tokenResponse;
//	    	  console.log(response);
	    	  callback(result);
	      });
	    } catch (e) { console.log(e); }
	  }).on('error', function(e) { console.log ("got error, "); });
    request.write('grant_type=client_credentials');
    request.end(result);
	}
	
	
  app.get('/getSpaces', function(req,res) {
  	console.log('in getSpaces');
  	res.setHeader('Content-Type','application/json');
  	res.end(testAuth());
//  	getToken(function(result) {
//  	  var json = JSON.parse(result);
//  	  var expires_in = json.expires_in;
//  		console.log('called getToken and result is ', json);
//      res.setHeader('Content-Type','application/json');
//  		res.end(result);
//  	});
  });

}