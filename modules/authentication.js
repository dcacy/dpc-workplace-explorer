module.exports = function(app) {
	'use strict';

	var Promise = require('promise');
	var rp = require('request-promise');
	var db = require('./db');

	const WWS_URL = "https://api.watsonwork.ibm.com";
	const WWS_CLIENT_URL = "https://workspace.ibm.com";
	const AUTHORIZATION_API = "/oauth/token";
	const OAUTH_ENDPOINT = "/oauth/authorize";
	const sixtydays = 1000 * 60 * 60 * 24 * 60;
//	const onehour = 1000 * 60 * 60;
	const APP_ID = process.env.WORKSPACE_APP_ID;
	const APP_SECRET = process.env.WORKSPACE_APP_SECRET;
	
	const vcap_application = JSON.parse(process.env.VCAP_APPLICATION);
	const APP_HOSTNAME = 'https://' + vcap_application.application_uris[0];
	
	/*
	 * The login process checks for an existing cookie which has the WW user id. If it finds one,
	 * it gets the oauth refresh token for that user from the database, then uses that token
	 * to get an oauth authentication token which it puts into session. Lastly, it redirects to 
	 * the web page which will load the spaces.
	 * However, if it does not find a cookie, or if the refresh token for that user has expired,
	 * then it redirects to WW to go through the oauth authentication process.
	 */
	app.get('/login', function(req,res) {
		var redirectURL = WWS_CLIENT_URL
		+ OAUTH_ENDPOINT 
		+ "?response_type=code&client_id=" 
		+ APP_ID 
		+ "&redirect_uri=" 
		+ APP_HOSTNAME 
		+ "/oauthback&state=" 
		+ req.session.id;
		
		if ( req.cookies ) {
			if ( req.cookies.dpcWorkspaceExplorer 
					&& typeof req.cookies.dpcWorkspaceExplorer != 'undefined' 
					&& req.cookies.dpcWorkspaceExplorer != 'undefined') {
//				console.log('found my cookie and it is', req.cookies.dpcWorkspaceExplorer);
				// get refresh token from db
				db.getRefreshToken(req.cookies.dpcWorkspaceExplorer)
				.then(function(results){
					// get auth token from WW
					getAuthTokenFromRefreshToken(results.refreshToken)
					.then(function(result){
//						console.log('success getting auth token from refresh token...redirecting');
						// put auth token into session
		        req.session.accessToken = result.access_token;
		        req.session.userName = result.displayName;
						res.redirect('/spaces.html');
					})
					.catch(function(err){
						// something went wrong so just clear the cookie and start the oauth process
						console.log('error getting auth token from refresh token');
						res.clearCookie('dpcWorkspaceExplorer');
				    res.redirect('/login');
					});
				})
				.catch(function(err){
					// something went wrong so just clear the cookie and start the oauth process
					console.log('error getting refresh token');
					res.clearCookie('dpcWorkspaceExplorer');
			    res.redirect('/login');
				});
			} else {
				// no cookie so start oauth process
		    res.redirect(redirectURL);

			}
		} else {
			// no cookie so start oauth process
	    res.redirect(redirectURL);

		}  	
  });
	
	/*
	 * The user is redirected to this URI after going through the WW oauth process.
	 * Attempt to get an access token; if we get one, redirect to the page which will
	 * load the WW data.
	 */
	app.get("/oauthback", function(req, res) {
//    console.log("-----------------------------");
//    console.log("Starting OAuth Leg 2 sequence");
    var redirect_uri = APP_HOSTNAME + "/oauthback";

    if (req.query.error) {
        console.log("Authorization step returned an error. User probably clicked cancel.");
        res.redirect('/');
        return;
    }

    var code = req.query.code;
    var state = req.query.state;
//    console.log("Receiving code %s and state %s", code, state);

    // Get the accessToken
    getAuthFromOAuthToken(APP_ID, APP_SECRET, code, redirect_uri)
    .then(function(results){
//    	console.log('successful call to getAuthFromOAuthToken');
      // Add the accesstoken to the session
      req.session.accessToken = results.access_token;
      // set userid in cookie
      res.cookie("dpcWorkspaceExplorer", results.id, {maxAge: sixtydays});
      // store user info in database to make future logins easier
      db.storeUserInfo({userid:results.id,userName:results.displayName,refreshToken:results.refresh_token});

      console.log("We have an accessToken for %s.", results.displayName);
//      console.log("Redirecting user to spaces.html");
      res.redirect("/spaces.html");
    })
    .catch(function(err){
    	// don't know why we are here so just redirect
    	res.redirect('/');
    });

	});
	
	/*
	 * We have an oauth code so try to authenticate.
	 * Returns a promise.
	 */
	function getAuthFromOAuthToken(app_id, app_secret, oauth_code, redirect_uri) {

		return new Promise(function(resolve, reject){
			
			var options = {
			    method: 'POST',
			    uri: `${WWS_URL}${AUTHORIZATION_API}`,
			    "auth": {
	          "user": app_id,
	          "pass": app_secret
	      },
	      "form": {
	          "grant_type": "authorization_code",
	          "code": oauth_code,
	          "redirect_uri": redirect_uri
	      },
	      resolveWithFullResponse: true, // gives us the statusCode
		    json: true // Automatically parses the body to JSON
			};
			console.log("Issuing Authentication request with grant type 'authorization_code'");
	
			rp(options)
	    .then(function (parsedBody) {
	        console.log('authentication succeeded ');
	        if (parsedBody.statusCode !== 200) {
	          // if our app can't authenticate then it must have been
	          // disabled. Just return.
	          console.log("ERROR: App can't authenticate");
	          reject(new Error("App cannot authenticate"));
	        }
//	        console.log('body is', parsedBody.body);
	        resolve(parsedBody.body);
	    })
	    .catch(function (err) {
	        console.log('authentication actually failed:', err);
	        reject(err);
	    });
			
		});
	}
	
	
	/*
	 * If we have a refresh token, we can get the auth token.
	 * Returns a Promise
	 */
	function getAuthTokenFromRefreshToken(refreshToken) {
    console.log("Issuing Authentication request with grant type 'refresh_token'");

    return new Promise(function(resolve, reject) {
			
			var options = {
			    method: 'POST',
			    uri: `${WWS_URL}${AUTHORIZATION_API}`,
			    'auth': {
            'user': APP_ID,
            'pass': APP_SECRET
			    },
	        'form': {
	          'grant_type': 'refresh_token',
	          'refresh_token': refreshToken
	        },
				  json: true // Automatically parses the body to JSON
			};
			rp(options)
	    .then(function (parsedBody) {
//	        console.log('got auth token from refresh token');
	        resolve(parsedBody);
	    })
	    .catch(function (err) {
	        console.log('failed to get auth token from refresh token',err);
	        reject(err);
	    });
		});
   }


}