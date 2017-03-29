/*eslint-env node*/

var express = require('express'),
  cfenv = require('cfenv');
var session = require('client-sessions');

// create a new express server
var app = express();

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

console.log('--------------- checking dotenv -------------');
require('dotenv').config({silent: true, path: 'local.env'});
console.log('--------------- getting VCAP_SERVICES -------------');
var vcap_services = JSON.parse(process.env.VCAP_SERVICES);

app.use(session({
  cookieName: 'session',
  secret: 'here-is-a-secret',
  duration: 30 * 60 * 1000,
  activeDuration: 30 * 60 * 1000,
}));

//var https = require('https');
var authentication = require('./modules/authentication');
var cloudant = require('./modules/cloudant');
//var spaces = require('./modules/spaces');

authentication(app);
cloudant(app);
//spaces(app);

console.log('VCAP_APPLICATION');
console.dir(process.env.VCAP_APPLICATION);
//app.get('/vcap', function(req,res) {
//	console.log('in vcap');
//	console.log('type of vcap is ', typeof process.env.VCAP_SERVICES);
////	getToken(function(result) {
////		console.log('called getToken and result is ', result);
//		res.end(process.env.VCAP_SERVICES);
////	});
//});
//console.log('vcap:', process.env.VCAP_SERVICES);

var CLOUDANT_USER = vcap_services.cloudantNoSQLDB[0].credentials.username;
var CLOUDANT_PW = vcap_services.cloudantNoSQLDB[0].credentials.password;

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
// appid 3b7bc12c-da5d-46d3-a7e1-51c7e8b6295d
// app secret nsn6tep1ixsp3ss681c2huol2ryvkyaa

