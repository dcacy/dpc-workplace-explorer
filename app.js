/*eslint-env node*/

var express = require('express'),
  cfenv = require('cfenv');

// create a new express server
var app = express();

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

//var https = require('https');
var authentication = require('./modules/authentication');
var spaces = require('./modules/spaces');

authentication(app);
spaces(app);

//app.get('/getToken', function(req,res) {
//	console.log('in getToken');
////	getToken(function(result) {
////		console.log('called getToken and result is ', result);
//		res.end('done');
////	});
//});

if (process && process.env && process.env.VCAP_SERVICES) {
	console.log('vcap services: ', process.env.VCAP_SERVICES);
} else {
	console.log('no vcap services');
}


// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
// appid 3b7bc12c-da5d-46d3-a7e1-51c7e8b6295d
// app secret nsn6tep1ixsp3ss681c2huol2ryvkyaa

