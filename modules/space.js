


module.exports = function(app) {

//	console.log('in space');
	'use strict';

//	var https = require('https');
//var PropertiesReader = require('properties-reader');
//var properties = PropertiesReader('./workspace.properties');
var Promise = require('promise');
var request = require('request');
var rp = require('request-promise');
var url = require('url');
var bodyParser = require('body-parser');
app.use(bodyParser.json());

//var session = require('client-sessions');


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
//console.log('vcap_application');
//console.dir(vcap_application); 
var APP_HOSTNAME = 'https://' + vcap_application.application_uris[0];
//APP_HOSTNAME = 'https://blogwoods.net:6012'; // testing

//app.use(session({
//  cookieName: 'session',
//  secret: 'here-is-a-secret',
////  duration: 30 * 60 * 1000,
////  activeDuration: 5 * 60 * 1000
//}));
	
	app.get('/getSpaceDetails', function(req,res) {
	  var qs = url.parse(req.url,true).query;
	  console.dir(qs);
	  var spaceID = qs.id;
//	  console.dir(req.session);
	  var token = req.session.accessToken;
//	  token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6WyJyZWFkIiwid3JpdGUiXSwiaWQiOiIzYjdiYzEyYy1kYTVkLTQ2ZDMtYTdlMS01MWM3ZThiNjI5NWQiLCJleHAiOjE0OTEyOTUwNDksImp0aSI6Ijk2M2Y0MjljLTkyZDItNGI0Ni04MjEwLWMxNTg5ZDExOWUzYiIsImNsaWVudF9pZCI6IjNiN2JjMTJjLWRhNWQtNDZkMy1hN2UxLTUxYzdlOGI2Mjk1ZCJ9.LBR93rVsWKLHbgPUWvP5nM0Cra5dW50p-g2fW1eUzD-hrvhRquS5YuE_1lnDTjl2XALhpyB0G9w4l9javgRI5qQnpB9ior97iPPvK6aghkyPqgTrQCzFUs_6DmpsMOUg7takrzNFilq6RWWTt3leHJyE5vG-vBvAlYTaU5NFfMsqrJX31aMKqLYrRNFaYQ_3HnH0Adga0n7tP2t5mJU6zm9Zk0NQ5ZswJjev3ibYhxRz3YV6xMptxNtOtlLS5BOoyIllgBW3aIswI9ddRkVpOSRZmBJIkJN3mVXyH2jYlPo8yUY-JcFld1Unummlb-JZbZ0pS_fD4ASzyixEWEhc3w";
//	  console.log('token: <' + token + '> and type is ' + typeof token);
	  if ( typeof token === 'undefined' || token == 'undefined' ) {
	  	console.log('/getSpaceDetails: no token');
	  	res.status(400);
	  	res.end('{"error":"Authentication token is not set."}');
	  } else if ( typeof spaceID === undefined || spaceID === '') {
	  	console.log('/getSpaceDetails: no space ID provided');
	  	res.status(400);
	  	res.end('{"error":"You must provide a Space ID."}');
	  } else {
		  getSpaceInfo(token, spaceID)
		  .then(function(result){
//		  	console.dir(result.conversation.messages);
//		  	console.log('start:',result.conversation.messages.pageInfo.startCursor);
//		  	console.dir(req.session);
		  	req.session.startCursor = result.conversation.messages.pageInfo.startCursor;
		  	req.session.endCursor = result.conversation.messages.pageInfo.endCursor;
		  	console.dir(req.session);
		  	res.end(JSON.stringify(result));
		  })
		  .catch(function(err) {
		  	console.log(err.status, err.message);
		  	res.status(500);
		  	res.end('{"error":"status = ' + err.status + ', message = ' + err.message);
		  });
	  }
//	  res.end('{"result":"done"}');
  	
  	
  });
	
	function getSpaceInfo(token, spaceID) {

		console.log('in method getSpaceInfo');
//		var query = 'query getSpace { space(id: "' + spaceID + '") { title description membersUpdated members { items { email displayName } } conversation{ messages{ items { content } } } }}}';
		var query = 'query getSpace {'
		  + 'space(id: "' + spaceID + '") {'
		  + '  title'
		  + '  description'
		  + '  membersUpdated'
		  + '  members(first: 200) {'
		  + '   items {'
		  + '    email'
		  + '    displayName'
		  + '    }'
		  + '  }'
		  + '  conversation {'
		  + '    messages(first: 200) {'
		  + '      pageInfo {'
		  + '        startCursor'
		  + '        endCursor'
		  + '        hasPreviousPage'
		  + '        hasNextPage'
		  + '      }'
		  + '      items {'
		  + '        content'
		  + '        created'
		  + '        id'
		  + '        contentType'
		  + '        createdBy {'
      + '         displayName'
      + '         photoUrl'
      + '        }'
		  + '        annotations'
		  + '      }'
		  + '    }'
		  + '  }'
		  + ' }'
		  + '}'
		  ;
		return new Promise(function(resolve, reject){
//			getToken().then(function(result) {
//				console.log('token: ', result);
//				var token = JSON.parse(result);
//				var access_token = token.access_token;
				console.log('getting Space Info');
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
		        console.log('graphql to get space info succeeded');
//		        console.dir(parsedBody.data.spaces.items);
		        resolve(parsedBody.data.space);
		    })
		    .catch(function(err) {
		        console.log('graphql to get space info failed');
		        reject(err);
		    });
				
				
			
//			},
//			function(err){
//			console.log('error: ', err.statusCode, err.message);			
//			reject(err);
//			});			
		});


	
	}
/*
 * 
 */

}