/*eslint-env node*/

var express = require('express');
var cfenv = require('cfenv');
var session = require('express-session');
var cookieParser = require("cookie-parser");

var app = express();

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// when testing locally, get environment var VCAP_SERVICES from local.env
require('dotenv').config({silent: true, path: 'local.env'});
console.log('--------------- getting VCAP_SERVICES -------------');
var vcap_services = JSON.parse(process.env.VCAP_SERVICES);

app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: 'shh-its-a-secret',
  cookie: {
      maxAge: 1000 * 60 * 60
  }
}));

app.use(cookieParser());


var authentication = require('./modules/authentication');
authentication(app);
var db = require('./modules/db');
var space = require('./modules/space');
space(app);
var message = require('./modules/message');
message(app);

// for testing
app.get('/clearCookies', function(req,res) {
	res.clearCookie('dpcWorkspaceExplorer');
	res.end('done');	
});

if (process.env.LOCAL ) {
	console.log('running LOCAL');
//start for SSL
	var fs = require('fs');
	var sslPath = '/Users/skipper/letsencrypt/live/blogwoods.net/';
	var options = {  
	    key: fs.readFileSync(sslPath + 'privkey.pem'),
	    cert: fs.readFileSync(sslPath + 'fullchain.pem')
	};
	var https = require('https');
	https.createServer(options, app).listen(appEnv.port, '0.0.0.0', function() {
		console.log('local server starting on', appEnv.url);
	});
	// end for SSL	
} else {
	console.log('running on bluemix');
	//start server on the specified port and binding host
	app.listen(appEnv.port, '0.0.0.0', function() {
	  console.log("server starting on " + appEnv.url);
	});
}