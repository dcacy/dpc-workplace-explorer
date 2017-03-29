"use strict";
// --------------------------------------------------------------------------
// Require statements
// --------------------------------------------------------------------------
var express = require("express");
var request = require("request");
var session = require('express-session');
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var createTextVersion = require("textversionjs");
var requestjs = require("request-json");
var Cloudant = require("cloudant");

// --------------------------------------------------------------------------
// Setup global variables
// --------------------------------------------------------------------------

// Workspace API Setup - fixed stuff
const WWS_URL = "https://api.watsonwork.ibm.com";
const WWS_CLIENT_URL = "https://workspace.ibm.com";
const AUTHORIZATION_API = "/oauth/token";
const OAUTH_ENDPOINT = "/oauth/authorize";
const SPACE_URI = "/space/";
const sixtydays = 1000 * 60 * 60 * 24 * 60;
const onehour = 1000 * 60 * 60;

var WEBHOOK_VERIFICATION_TOKEN_HEADER = "X-OUTBOUND-TOKEN".toLowerCase();

// The Workspace App IDs
var APP_ID;
var APP_SECRET;

// cloudantNoSQLDB
var CLOUDANT_USER;
var CLOUDANT_PW;

// ICS Log Setup
const LOG_APP = "IWWVerseToSpace";
const LOG_FEATURE = "VerseToSpace";
var LOG_DC;
var LOG_AUTHOR;

// App config
var APP_HOSTNAME;

// --------------------------------------------------------------------------
// Read environment variables
// --------------------------------------------------------------------------

// When not present in the system environment variables, dotenv will take them
// from the local file
require('dotenv').config({silent: true, path: 'my.env'});

// See if you can get them from Bluemix bound services (VCAP_SERVICES)
if (process.env.VCAP_SERVICES) {
    var bluemix_env = JSON.parse(process.env.VCAP_SERVICES);
    console.log("Checking VCAP_SERVICES");

    // Check if we have the cloudant api
    if (bluemix_env.cloudantNoSQLDB) {
        CLOUDANT_USER = bluemix_env.cloudantNoSQLDB[0].credentials.username;
        CLOUDANT_PW = bluemix_env.cloudantNoSQLDB[0].credentials.password;
        console.log("Cloudant API keys coming from Bluemix VCAP");
    } else {
        CLOUDANT_USER = process.env.CLOUDANT_USER;
        CLOUDANT_PW = process.env.CLOUDANT_PW;
        console.log("Cloudant API not found in VCAP_SERVICES, keys coming from local");
    }

} else {
    CLOUDANT_USER = process.env.CLOUDANT_USER;
    CLOUDANT_PW = process.env.CLOUDANT_PW;
    console.log("Cloudant API keys coming from local");
}

// Get info from VCAP_APPLICATION when on bluemix
if (process.env.VCAP_APPLICATION) {
    console.log(process.env.VCAP_APPLICATION);
    var bluemix_app = JSON.parse(process.env.VCAP_APPLICATION);
    console.log("Checking VCAP_APPLICATION");

    // Check if we have the app uri's
    if (bluemix_app.application_uris) {
        APP_HOSTNAME = "https://" + bluemix_app.application_uris[0];
        console.log("App Hostname from VCAP_APPLICATION : ", APP_HOSTNAME);
    } else {
        APP_HOSTNAME = process.env.APP_HOSTNAME;
        console.log("App Hostname from env file : ", APP_HOSTNAME);
    }

} else {
    APP_HOSTNAME = process.env.APP_HOSTNAME;
    console.log("App Hostname from env file : ", APP_HOSTNAME);
}

// Grab the rest from the bluemix env. or from the local env. file
// Workspace APP keys
APP_ID = process.env.APP_ID;
APP_SECRET = process.env.APP_SECRET;

// Logging parameters
LOG_DC = process.env.LOG_DC;
LOG_AUTHOR = process.env.LOG_AUTHOR;

// --------------------------------------------------------------------------
// Setup Cloudant
// --------------------------------------------------------------------------
// Initialize the library with my account.
var cloudant = Cloudant({account: CLOUDANT_USER, password: CLOUDANT_PW});

// --------------------------------------------------------------------------
// Setup the express server
// --------------------------------------------------------------------------
var app = express();

// serve the files out of ./public as our main files
app.use(express.static(__dirname + "/public"));

// setup session management
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: 'VERSEANDWATSONWORKSPACEARECOOL',
    cookie: {
        maxAge: onehour
    }
}));

// add cookie parser middleware
app.use(cookieParser());

// create application/json parser
var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({extended: false});

// --------------------------------------------------------------------------
// Express Server runtime
// --------------------------------------------------------------------------
// Start our server !
app.listen(process.env.PORT || 3000, function() {
    console.log("INFO: app is listening on port %s", (process.env.PORT || 3000));

    cloudant.db.list(function(err, allDbs) {
        console.log('Checking cloudant by listing all my databases: %s', allDbs.join(', '));
    });
});


// --------------------------------------------------------------------------
// Methods used in Ajax calls from the static web pages
// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// Save the verseData object
app.post("/saveversedata", jsonParser, function(req, res) {
    console.log("------------------------------------");
    console.log("Starting save verse data");

    // Get the versedata out of the request
    var versedata = req.body;

    // Get the session
    var sess = req.session;
    console.log("Using session with id :", sess.id);

    // Save the versedata in the session
    sess.versedata = versedata;

    res.sendStatus(200);
});

// --------------------------------------------------------------------------
// Get the verseData object
app.get("/getversedata", function(req, res) {
    console.log("------------------------------------");
    console.log("Starting get verse data");

    // Get the session
    var sess = req.session
    console.log("Using session with id :", sess.id);

    // Get the versedata out of the session
    var versedata = sess.versedata;

    // Send it back
    res.json(versedata);
});

// --------------------------------------------------------------------------
// Get the spaces of the user
app.get("/getspaces", function(req, res) {
    console.log("------------------------------------");
    console.log("Starting get spaces");

    // Get the session
    var sess = req.session
    console.log("Using session with id :", sess.id);

    // Call graphQL
    getSpaces(sess.accessToken, function(err, spacesdata, accessToken) {
        if (!err) {
            console.log("Sending back spaces");

            // Send it back
            res.json(spacesdata);
        } else {
            res.sendStatus(500);
        }
    })
});

// --------------------------------------------------------------------------
// Methods called in the flow of the app
// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// Get the Workspace user
app.get("/getwsuser", urlencodedParser, function(req, res) {
    console.log("------------------------------------");
    console.log("Starting get ws user");

    // Get the session
    var sess = req.session
    var versedata = sess.versedata;
    console.log("... we have data with subject ", versedata.context.subject);
    console.log("Our session id =", sess.id);

    // Check if we have a rememberme cookie.
    if (req.cookies.versetospaceid) {
        var dbkey = req.cookies.versetospaceid;

        // Let's see if we have this id in the database
        var versetospace = cloudant.db.use("versetospace");
        versetospace.get(dbkey, {
            revs_info: false
        }, function(err, doc) {
            if (!err) {
                console.log("We have an entry in the db for", doc.userName);

                // Let's get a new JWT from the refreshToken
                getAuthFromRefreshToken(APP_ID, APP_SECRET, doc.refreshToken, function(err, accessToken, refreshToken, userName, userid) {
                    if (!err) {
                        console.log("We have a new accessToken !!!");

                        // Add the userid & accesstoken to the session
                        req.session.userid = userid;
                        req.session.accessToken = accessToken;

                        // Forward the user to the UI
                        console.log("Redirecting user to versetospaceui.html");
                        res.redirect("/versetospaceui.html");

                        // Update the database with the new refreshToken
                        doc.refreshToken = refreshToken;
                        versetospace.insert(doc, userid, function(err, doc) {
                            if (err) {
                                console.log("Error adding refreshtoken to database :", err.message);
                            } else {
                                console.log("Refresh token updated for user", userName);
                            }
                        });
                    } else {
                        // No valid refreshToken : Need to start the OAuth Leg 1 flow
                        console.log("No valid refreshToken : Need to start the OAuth Leg 1 flow");
                        oauthLegOneRedirect(req, res, sess.id);
                        return;
                    }
                })

            } else {
                // No db record : Need to start the OAuth Leg 1 flow
                console.log("No db record : Need to start the OAuth Leg 1 flow");
                oauthLegOneRedirect(req, res, sess.id);
                return;
            }
        });
    } else {
        // No cookie : Need to start the OAuth Leg 1 flow
        console.log("No cookie : Need to start the OAuth Leg 1 flow");
        oauthLegOneRedirect(req, res, sess.id);
        return;
    }
});

// --------------------------------------------------------------------------
// OAuth return
app.get("/oauthback", function(req, res) {
    console.log("-----------------------------");
    console.log("Starting OAuth Leg 2 sequence");
    var redirect_uri = APP_HOSTNAME + "/oauthback";

    if (req.query.error) {
        console.log("Authorization step returned an error. User probably clicked cancel.");
        res.redirect("/error.html");
        return;
    }

    var code = req.query.code;
    var state = req.query.state;
    console.log("Receiving code %s and state %s", code, state);

    // Get the session
    var sess = req.session
    var versedata = sess.versedata;
    console.log("... we have data with subject ", versedata.context.subject);
    console.log("Our session id =", sess.id);

    // Get the accessToken
    getAuthFromOAuthToken(APP_ID, APP_SECRET, code, redirect_uri, function(error, accessToken, refreshToken, userName, userid) {
        // Add the userid & accesstoken to the session
        req.session.userid = userid;
        req.session.accessToken = accessToken;

        // set userid in cookie
        setRememberMeCookie(res, userid);

        // Save the Refreshtoken for reuse
        var versetospace = cloudant.db.use("versetospace");

        // check if we already have a record with sess.id as key.
        versetospace.get(userid, {
            revs_info: false
        }, function(err, doc) {
            if (!err) {
                // update the refreshtoken
                doc.refreshToken = refreshToken;

                versetospace.insert(doc, userid, function(err, doc) {
                    if (err) {
                        console.log("Error adding refreshtoken to database :", err.message);
                    } else {
                        console.log("Refresh token updated for user", userName);
                    }
                });
            } else {
                // it's a new record.
                versetospace.insert({
                    userid: userid,
                    userName: userName,
                    refreshToken: refreshToken
                }, userid, function(err, body, header) {
                    if (err) {
                        return console.log("Error adding refreshtoken to database :", err.message);
                    }

                    console.log("Refresh token added to database for user", userName);
                });
            }
        });

        console.log("We have an accessToken for %s.", userName);
        console.log("Redirecting user to versetospaceui.html");
        res.redirect("/versetospaceui.html");
    });
});

// --------------------------------------------------------------------------
// New Form post IN
app.post("/versetospace", urlencodedParser, function(req, res) {
    console.log("------------------------------------");
    console.log("Starting VerseToSpace Create or Use Space sequence");

    var spacenamenew = req.body.spacenamenew;
    var spaceidchosen = req.body.spaceidchosen;
    var members = req.body.members;
    var mailblob = req.body.mailblob;
    var createoruse = req.body.createoruse;

    // Convert html mail to plain text
    var mailtext = createTextVersion(mailblob);

    // When only one member is selected, a string is returned instead of an array
    // Let's make it consistent - members is always an array
    if (typeof members === 'string') {
        members = [members];
    }

    console.log("New Space name : %s", spacenamenew);
    console.log("Space Id chosen : %s", spaceidchosen);
    console.log("Member list : %s", members);
    console.log("Create or use : %s", createoruse);

    // Get the session
    var sess = req.session;
    console.log("Using session with id :", sess.id);
    var accessToken = sess.accessToken;

    // Do we use or create a space ?
    if (createoruse === "create") {
        createNewSpace(accessToken, spacenamenew, function(err, spaceid, accessToken){
          if(!err){
            addMailAndUsersToSpace(res, accessToken, spaceid, members, mailtext);
          }
          else {
            res.redirect("/error.html");
          }

        });
        return;
    }

    if (createoruse === "use") {
        addMailAndUsersToSpace(res, accessToken, spaceidchosen, members, mailtext);
        return;
    }

    // It should always be use or create, so if we end up here, it failed.
    res.redirect("/error.html");
});

// --------------------------------------------------------------------------
// App specific helper methods
// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// Adds the email and the users to the space
function addMailAndUsersToSpace(res, accessToken, spaceid, members, mailtext) {
    res.redirect(WWS_CLIENT_URL + SPACE_URI + spaceid);

    if(members){
      // Add the members
      var arrayLength = members.length;
      console.log("Found %s users to add.", arrayLength);
      for (var i = 0; i < arrayLength; i++) {
          getUserId(accessToken, members[i], function(err, personid, jwt) {
              if (!err) {
                  // Add the user to the space
                  addUserToSpace(jwt, spaceid, personid, function(err, jwt) {
                      console.log("User added to space !");
                  });
              } else {
                  console.log("Unable to add user ;-(");
              }
          })
      }
    }

    // Add the Body of the mail to the space
    postMessageToSpace(accessToken, spaceid, mailtext, function(err, success, jwt) {
        return;
    });
}

// --------------------------------------------------------------------------
// OAuth Leg1 redirect sequence
function oauthLegOneRedirect(req, res, state) {
    console.log("Redirecting to the Watson Workspace OAuth Endpoint.");
    res.redirect(WWS_CLIENT_URL + OAUTH_ENDPOINT + "?response_type=code&client_id=" + APP_ID + "&redirect_uri=" + APP_HOSTNAME + "/oauthback&state=" + state);
}

// --------------------------------------------------------------------------
// setting a rememberMeCookie for the userid.
function setRememberMeCookie(res, userid) {
    // Set a remember me cookie
    console.log("Setting a cookie to remember the user for 60 days.");
    res.cookie("versetospaceid", userid, {maxAge: sixtydays});
}


// --------------------------------------------------------------------------
// Generic helper methods (can be reused in other apps)
// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// GraphQL Create new Space
function createNewSpace(accessToken, spacename, callback) {
    // Build the GraphQL request
    const GraphQLOptions = {
        "url": `${WWS_URL}/graphql`,
        "headers": {
            "Content-Type": "application/graphql",
            "x-graphql-view": "PUBLIC",
            "jwt": accessToken
        },
        "method": "POST",
        "body": ""
    };

    GraphQLOptions.headers.jwt = accessToken;
    GraphQLOptions.body = "mutation createSpace{createSpace(input:{title:\"" + spacename + "\",members: [\"\"]}){space {id}}}";

    // Create the space
    request(GraphQLOptions, function(err, response, graphqlbody) {
        if (!err && response.statusCode === 200) {
            //console.log(graphqlbody);
            var bodyParsed = JSON.parse(graphqlbody);

            if (bodyParsed.data.createSpace) {
                var spaceid = bodyParsed.data.createSpace.space.id;
                console.log("Space created with ID", spaceid);
                callback(null, spaceid, accessToken);

            } else {
                var error = new Error("");
                callback(error, null, accessToken);
            }

        } else {
            console.log("ERROR: Can't retrieve " + GraphQLOptions.body + " status:" + response.statusCode);
            var error = new Error("");
            callback(error, null, accessToken);
        }
    });
}

// --------------------------------------------------------------------------
// graphQL Get Userid from mail
function getUserId(accessToken, email, callback) {
    // Build the GraphQL request
    const GraphQLOptions = {
        "url": `${WWS_URL}/graphql`,
        "headers": {
            "Content-Type": "application/graphql",
            "x-graphql-view": "PUBLIC",
            "jwt": "${jwt}"
        },
        "method": "POST",
        "body": ""
    };

    GraphQLOptions.headers.jwt = accessToken;
    GraphQLOptions.body = "query getProfile{person(email:\"" + email + "\") {id displayName}}";

    request(GraphQLOptions, function(err, response, graphqlbody) {

        if (!err && response.statusCode === 200) {
            //console.log(graphqlbody);
            var bodyParsed = JSON.parse(graphqlbody);
            if (bodyParsed.data.person) {

                var personid = bodyParsed.data.person.id;
                var personname = bodyParsed.data.person.displayName;
                console.log("Found user : " + personname + ", ID = " + personid);
                callback(null, personid, accessToken);
            } else {
                var error = new Error("");
                callback(error, "Sorry, can't find that user.", accessToken);
            }

        } else {
            console.log("ERROR: Can't retrieve " + GraphQLOptions.body + " status:" + response.statusCode);
            callback(err, null, accessToken);
        }
    });
}

// --------------------------------------------------------------------------
// graphQL Get the user's Spaces (max 200)
function getSpaces(accessToken, callback) {
    // Build the GraphQL request
    const GraphQLOptions = {
        "url": `${WWS_URL}/graphql`,
        "headers": {
            "Content-Type": "application/graphql",
            "x-graphql-view": "PUBLIC",
            "jwt": "${jwt}"
        },
        "method": "POST",
        "body": ""
    };

    GraphQLOptions.headers.jwt = accessToken;
    GraphQLOptions.body = "query getSpaces {spaces(first:200) {items {title id}}}";

    console.log("Calling GraphQL query getSpaces");
    request(GraphQLOptions, function(err, response, graphqlbody) {

        if (!err && response.statusCode === 200) {
            var bodyParsed = JSON.parse(graphqlbody);
            if (bodyParsed.data.spaces) {
                console.log("Got list of spaces");
                callback(null, bodyParsed.data.spaces, accessToken);
            } else {
                console.log("Graphql not returning any spaces, dumping return :");
                console.log(graphqlbody);
                var error = new Error("");
                callback(error, "error getting spaces", accessToken);
            }

        } else {
            console.log("ERROR: Can't retrieve " + GraphQLOptions.body + " status:" + response.statusCode);
            var error = new Error("");
            callback(err, null, accessToken);
        }
    });
}

//--------------------------------------------------------------------------
//graphQL Add user to Space
function addUserToSpace(accessToken, spaceid, userid, callback) {

    // Build the GraphQL request
    const GraphQLOptions = {
        "url": `${WWS_URL}/graphql`,
        "headers": {
            "Content-Type": "application/graphql",
            "x-graphql-view": "PUBLIC",
            "jwt": "${jwt}"
        },
        "method": "POST",
        "body": ""
    };

    GraphQLOptions.headers.jwt = accessToken;
    GraphQLOptions.body = "mutation updateSpaceAddMembers{updateSpace(input: { id: \"" + spaceid + "\",  members: [\"" + userid + "\"], memberOperation: ADD}){memberIdsChanged space {title membersUpdated members {items {id email displayName}}}}}";

    request(GraphQLOptions, function(err, response, graphqlbody) {

        if (!err && response.statusCode === 200) {
            //console.log(graphqlbody);
            var bodyParsed = JSON.parse(graphqlbody);
            callback(null, accessToken);
        } else {
            console.log("ERROR: Can't retrieve " + GraphQLOptions.body + " status:" + response.statusCode);
            callback(err, accessToken);
        }
    });
}

//--------------------------------------------------------------------------
//Post a message to a space
function postMessageToSpace(accessToken, spaceId, textMsg, callback) {
    var jsonClient = requestjs.createClient(WWS_URL);
    var urlToPostMessage = "/v1/spaces/" + spaceId + "/messages";
    jsonClient.headers.jwt = accessToken;

    // Building the message
    var messageData = {
        type: "appMessage",
        version: 1.0,
        annotations: [
            {
                type: "generic",
                version: 1.0,
                color: "#4178BE",
                title: "Email content :",
                text: textMsg,
                actor: {
                    name: "IBM Verse",
                    avatar: "",
                    url: ""
                }
            }
        ]
    };

    // Calling IWW API to post message
    jsonClient.post(urlToPostMessage, messageData, function(err, jsonRes, jsonBody) {
        if (jsonRes.statusCode === 201) {
            console.log("Message posted to IBM Watson Workspace successfully!");
            callback(null, true, accessToken);
        } else {
            console.log("Error posting to IBM Watson Workspace !");
            console.log("Return code : " + jsonRes.statusCode);
            console.log(jsonBody);
            callback(err, false, accessToken);
        }
    });
}

//--------------------------------------------------------------------------
//Get Authentication Token from an OAuth return code
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

    console.log("Issuing Authentication request with grant type 'authorization_code'");

    // Get the JWT Token
    request(authenticationOptions, function(err, response, authenticationBody) {
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

        callback(null, accessToken, refreshToken, userName, userid);
    });
}

//--------------------------------------------------------------------------
//Get Authentication Token from a Refresh token
function getAuthFromRefreshToken(app_id, app_secret, refreshToken, callback) {
    // Build request options for authentication.
    const authenticationOptions = {
        "method": "POST",
        "url": `${WWS_URL}${AUTHORIZATION_API}`,
        "auth": {
            "user": app_id,
            "pass": app_secret
        },
        "form": {
            "grant_type": "refresh_token",
            "refresh_token": refreshToken
        }
    };

    console.log("Issuing Authentication request with grant type 'refresh_token'");

    // Get the JWT Token
    request(authenticationOptions, function(err, response, authenticationBody) {
        if (err) {
            console.log("ERROR: Authentication request returned an error.");
            console.log(err);
            callback(err);
            return;
        }

        if (response.statusCode !== 200) {
            // App can't authenticate with refreshToken.
            // Just return an error
            var errormsg = "Error authenticating, statuscode=" + response.statusCode.toString();
            console.log("ERROR: App can't authenticate, statuscode =", response.statusCode.toString());
            callback(new Error(errormsg));
            return;
        }

        var reqbody = JSON.parse(authenticationBody);
        const accessToken = reqbody.access_token;
        const refreshToken = reqbody.refresh_token;
        const userName = reqbody.displayName;
        const userid = reqbody.id;

        callback(null, accessToken, refreshToken, userName, userid);
    });
}
