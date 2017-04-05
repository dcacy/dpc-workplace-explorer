'use strict';



module.exports = function(app) {

	var https = require('https');
//var PropertiesReader = require('properties-reader');
//var properties = PropertiesReader('./workspace.properties');
var Promise = require('promise');
var request = require('request');
var rp = require('request-promise');
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
	
	app.get('/oauth', function(req,res) {
//  	console.log('in oauth and session  is ', req.session);
  	console.log('appid is ', APP_ID,' and hostname is', APP_HOSTNAME);
  	console.log('mock is ', process.env.MOCK);
  	if ( process.env.MOCK && process.env.MOCK == 'true' ) {
  		res.end(process.env.MOCK_SPACES);
  	} else {
	  	var redirectURL = WWS_CLIENT_URL
				+ OAUTH_ENDPOINT 
				+ "?response_type=code&client_id=" 
				+ APP_ID 
				+ "&redirect_uri=" 
				+ APP_HOSTNAME 
				+ "/oauthback&state=" 
				+ req.session.id;
//	  	console.log('redirectURL:', redirectURL);
	    res.end('{"redirect": "' + redirectURL + '"}');
  	}
  	
  });
	
	app.get("/oauthback", function(req, res) {
    console.log("-----------------------------");
    console.log("Starting OAuth Leg 2 sequence");
    var redirect_uri = APP_HOSTNAME + "/oauthback";

    if (req.query.error) {
        console.log("Authorization step returned an error. User probably clicked cancel.");
//        res.redirect("/error.html");
        res.end('you clicked cancel maybe');
        return;
    }

    var code = req.query.code;
    var state = req.query.state;
    console.log("Receiving code %s and state %s", code, state);

    // Get the session
    var sess = req.session;
//    var versedata = sess.versedata;
//    console.log("... we have data with subject ", versedata.context.subject);
    console.log("Our session id =", sess.id);

    // Get the accessToken
    getAuthFromOAuthToken(APP_ID, APP_SECRET, code, redirect_uri, function(error, accessToken, refreshToken, userName, userid) {
    	console.log('in callback from getAuthFromOAuthToken');
//    	console.dir(req.session);
        // Add the userid & accesstoken to the session
        req.session.userid = userid;
        req.session.accessToken = accessToken;
//        console.log('now session is');
//        console.dir(req.session);
        // set userid in cookie
//        setRememberMeCookie(res, userid);

        // Save the Refreshtoken for reuse
//        var versetospace = cloudant.db.use("versetospace");

        // check if we already have a record with sess.id as key.
//        versetospace.get(userid, {
//            revs_info: false
//        }, function(err, doc) {
//            if (!err) {
//                // update the refreshtoken
//                doc.refreshToken = refreshToken;
//
//                versetospace.insert(doc, userid, function(err, doc) {
//                    if (err) {
//                        console.log("Error adding refreshtoken to database :", err.message);
//                    } else {
//                        console.log("Refresh token updated for user", userName);
//                    }
//                });
//            } else {
//                // it's a new record.
//                versetospace.insert({
//                    userid: userid,
//                    userName: userName,
//                    refreshToken: refreshToken
//                }, userid, function(err, body, header) {
//                    if (err) {
//                        return console.log("Error adding refreshtoken to database :", err.message);
//                    }
//
//                    console.log("Refresh token added to database for user", userName);
//                });
//            }
//        });

        console.log("We have an accessToken for %s.", userName);
        console.log("Redirecting user to spaces.html");
        res.redirect("/spaces.html");
//        res.end('good' + accessToken);
//        getSpaces2(accessToken)
//        .then(function(result){
//        	res.end(JSON.stringify(result));
//        })
//        .catch(function(err){
//        	console.log('error in getting spaces:', err);
//        });
    });
});

	
	function getAuthFromOAuthToken(app_id, app_secret, oauth_code, redirect_uri, callback) {
    // Build request options for authentication.
    const authenticationOptions = {
        "method": "POST",
        "url": `${WWS_URL}${AUTHORIZATION_API}`,
        "auth": {
            "user": app_id,
            "pass": app_secret
        },
        "form": {
            "grant_type": "authorization_code",
            "code": oauth_code,
            "redirect_uri": redirect_uri
        }
    };
//    console.log('auth options are', authenticationOptions);
    console.log("Issuing Authentication request with grant type 'authorization_code'");

    // Get the JWT Token
    request(authenticationOptions, function(err, response, authenticationBody) {
//    	console.log('response from auth: ', response.statusCode, ' and ', response.message);
        // If successful authentication, a 200 response code is returned
        if (response.statusCode !== 200) {
            // if our app can't authenticate then it must have been
            // disabled. Just return
            console.log("ERROR: App can't authenticate");
            callback(err, null);
            return;
        }

        var reqbody = JSON.parse(authenticationBody);
        const accessToken = reqbody.access_token;
        const refreshToken = reqbody.refresh_token;
        const userName = reqbody.displayName;
        const userid = reqbody.id;
        
//        console.log('token is ', accessToken);

        callback(null, accessToken, refreshToken, userName, userid);
    });
	}
	
	app.get('/getSpaces', function(req,res) {
		console.log('in getSpaces');
		var token = req.session.accessToken;
//		token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6WyJyZWFkIiwid3JpdGUiXSwiaWQiOiIzYjdiYzEyYy1kYTVkLTQ2ZDMtYTdlMS01MWM3ZThiNjI5NWQiLCJleHAiOjE0OTEyOTUwNDksImp0aSI6Ijk2M2Y0MjljLTkyZDItNGI0Ni04MjEwLWMxNTg5ZDExOWUzYiIsImNsaWVudF9pZCI6IjNiN2JjMTJjLWRhNWQtNDZkMy1hN2UxLTUxYzdlOGI2Mjk1ZCJ9.LBR93rVsWKLHbgPUWvP5nM0Cra5dW50p-g2fW1eUzD-hrvhRquS5YuE_1lnDTjl2XALhpyB0G9w4l9javgRI5qQnpB9ior97iPPvK6aghkyPqgTrQCzFUs_6DmpsMOUg7takrzNFilq6RWWTt3leHJyE5vG-vBvAlYTaU5NFfMsqrJX31aMKqLYrRNFaYQ_3HnH0Adga0n7tP2t5mJU6zm9Zk0NQ5ZswJjev3ibYhxRz3YV6xMptxNtOtlLS5BOoyIllgBW3aIswI9ddRkVpOSRZmBJIkJN3mVXyH2jYlPo8yUY-JcFld1Unummlb-JZbZ0pS_fD4ASzyixEWEhc3w";
//	  console.log('token: <' + token + '> and type is ' + typeof token);
	  if ( typeof token === 'undefined' || token == 'undefined' ) {
	  	console.log('/getSpaces: no token');
	  	res.status(400);
	  	res.end('{"error":"Authentication token is not set.}');
	  } else {
		  getSpaces2(token)
		  .then(function(result){
		  	res.end(JSON.stringify(result));
		  })
		  .catch(function(err) {
		  	console.log(err.status, err.message);
		  	res.status(500);
		  	res.end('{"error":"status = ' + err.status + ', message = ' + err.message);
		  });
	  }
//		getSpaces2
	});	
	
	function getSpaces2(token) {
		console.log('in method getSpaces2');
		return new Promise(function(resolve, reject){
//			getToken().then(function(result) {
//				console.log('token: ', result);
//				var token = JSON.parse(result);
//				var access_token = token.access_token;
				console.log('getting Spaces');
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
		        console.log('graphql to get spaces succeeded ');
//		        console.dir(parsedBody.data.spaces.items);
		        resolve(parsedBody.data.spaces.items);
		    })
		    .catch(function (err) {
		        console.log('graphql failed');
		        reject(err);
		    });
//			},
//			function(err){
//			console.log('error: ', err.statusCode, err.message);			
//			reject(err);
//			});			
		});


	}
	
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