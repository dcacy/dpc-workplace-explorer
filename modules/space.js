


module.exports = function(app) {

	'use strict';

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
var APP_HOSTNAME = 'https://' + vcap_application.application_uris[0];
	
app.get('/getSpaces', function(req,res) {
	var token = req.session.accessToken;
  if ( typeof token === 'undefined' || token == 'undefined' ) {
  	console.log('/getSpaces: no token');
  	res.status(400);
  	res.end('{"error":"Authentication token is not set.}');
  } else {
	  getSpaces(token)
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
 * getSpaces executes a GraphQL query to retrieve the spaces of which the user is a member
 * @params token {string} the oauth authentication token for this session
 * @returns {object} a Promise which resolves to the JSON list of spaces
 */
function getSpaces(token) {
	return new Promise(function(resolve, reject){
			var options = {
			    method: 'POST',
			    uri: 'https://api.watsonwork.ibm.com/graphql',
			    headers: {
			    	'Content-Type':'application/json',
			    	'jwt': token
			    },
			    body: {
			        query: 'query getSpaces { spaces(first: 20) {items {title id updated}}}'
			    },
			    json: true // Automatically stringifies the body to JSON
			};
			rp(options)
	    .then(function (parsedBody) {
	        resolve(parsedBody.data.spaces.items);
	    })
	    .catch(function (err) {
	        console.log('graphql failed');
	        reject(err);
	    });
	});
}

	/**
	 * Get the details (list of messages) for a space
	 */
	app.get('/getSpaceDetails', function(req,res) {
	  var qs = url.parse(req.url,true).query;
	  var spaceID = qs.id;
	  var token = req.session.accessToken;
	  if ( typeof token === 'undefined' || token == 'undefined' ) {
	  	console.log('/getSpaceDetails: no token');
	  	res.status(400);
	  	res.end('{"error":"Authentication token is not set."}');
	  } else if ( typeof spaceID === undefined || spaceID === '') {
	  	console.log('/getSpaceDetails: no space ID provided');
	  	res.status(400);
	  	res.end('{"error":"You must provide a Space ID."}');
	  } else {
	  	req.session.spaceID = spaceID;
		  getSpaceInfo(token, spaceID, undefined, 'first')
		  .then(function(result){
		  	req.session.startCursor = result.conversation.messages.pageInfo.startCursor;
		  	req.session.endCursor = result.conversation.messages.pageInfo.endCursor;
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
	 * getSpaceInfo execute GraphQL to get a set of messages from a Space
	 * @params token {string} the oauth authentication token for this session
	 * @params spaceID {string} the unique ID of this Space
	 * @params cursor {string} the cursor returned from the previous call to this function (may be undefined)
	 * @params direction {string} the direction to go from the cursor. Can be "first", "after", "before"
	 * @returns {object} a promise which resolves to JSON containing an array of messages
	 */
	function getSpaceInfo(token, spaceID, cursor, direction) {

		var cursorString = '';
		if ( typeof cursor !== 'undefined' ) {
			var whichDirection = direction === 'first' ? 'after' : 'before';
			cursorString = ', ' + whichDirection + ': "' + cursor + '"';
		}
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
		  + '    messages(' + direction + ': 10'
		  +     cursorString
		  + ') {'
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
		        resolve(parsedBody.data.space);
		    })
		    .catch(function(err) {
		        console.log('graphql to get space info failed');
		        reject(err);
		    });
		});
	}
	
	/**
	 * Page through the list of messages in a space
	 */
	app.get('/page', function(req,res) {
	  var qs = url.parse(req.url,true).query;
	  var direction = qs.direction;
	  var cursor = direction === 'previous' ? req.session.startCursor : req.session.endCursor;
	  var whichDirection = direction === 'previous' ? 'last ': 'first' ;
	  var spaceID = req.session.spaceID;
	  getSpaceInfo(req.session.accessToken, req.session.spaceID, cursor, whichDirection)
	  .then(function(result){
	  	req.session.startCursor = result.conversation.messages.pageInfo.startCursor;
	  	req.session.endCursor = result.conversation.messages.pageInfo.endCursor;
	  	res.end(JSON.stringify(result));
	  })
	  .catch(function(err) {
	  	console.log(err.status, err.message);
	  	res.status(500);
	  	res.end('{"error":"status = ' + err.status + ', message = ' + err.message);
	  });
	});


}