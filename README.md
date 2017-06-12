# dpc-workspace-explorer

This tool will let you peek behind the scenes of Watson Work to see the annotations which the system adds to messages posted to a Work Space. You can look at the sentiment, keywords, concepts, relationships, custom annotations, and more. See a demo here: [https://dpc-workspace-explorer.mybluemix.net](https://dpc-workspace-explorer.mybluemix.net).

Please see the LICENSE file for copyright and license information.

## Getting Started

1. Create a new Watson Work application [here](https://developer.watsonwork.ibm.com/apps). Make note of the App ID and secret, as you'll need to provide them to your application. You can do this via an environment variable in Bluemix or by hardcoding it in your app. This sample assumes the former.

1. The tool requires a Cloudant database. Create one on Bluemix [here](https://console.ng.bluemix.net/catalog/?category=services). Bind it to your application in Bluemix.

1. Download `date.format.js` from [https://gist.github.com/jhbsk/4690754](https://gist.github.com/jhbsk/4690754) and copy it to the `public/js` directory.

1. Download `jquery.loadmask.min.js` from [https://github.com/wallynm/jquery-loadmask](https://github.com/wallynm/jquery-loadmask) and copy it to the `public/js` directory.

1. Install the dependencies your application needs:

```
npm install
```

1. Start the application locally:

```
npm start
```

1. Navigate to the URL for your application in your browser. 
