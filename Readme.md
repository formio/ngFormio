http://form.io main application.
================================
This repository is the main application for the Form.IO project which brings in the separate components into a single
executable for the app part of the website. It is designed to be compiled and run from a CDN but includes tools to run
locally as a node server or from gulp. You MUST be running a formio-server and connect to it or the site will not work.

 - **ngFormio** @ /bower_components/ngFormio - The Form.IO renderer - https://github.com/formio/ngFormio
 - **ngFormBuilder** @ /bower_components/ngFormBuilder - The Form.IO form builder - https://github.com/formio/ngFormBuilder

Installation (Manual)
------------
In order to install and run this application, you will first need to install Node.JS. In addition, you
you will need to run the formio-server, preferably on port 3000. See https://github.com/formio/formio-server for
instructions on running it.

  - ```brew install node```

Next, install dependencies.

  - ```npm install```

Next, run a dev version of the site.

  - ```webpack-dev-server```

This will start the site on port 8080 (typically).


Developing
------------
In order to develop against the application, you will need to utilize npm link. Install ng-formio and ng-form-builder outside of the main directly and run ```npm link``` from within each one.

  - ```npm link ng-formio ng-formio-builder```

You may also want to uncomment the dev-tool line in webpack.config.js which will create sourcemaps in the compiled code for easier debugging. 

Deployment
---------------
There are five steps that need to be run to deploy a new version.

  - ```webpack -p```
  - ```docker build -t formio/formio-app:$TAG_NAME .```
  - ```docker push formio/formio-app:$TAG_NAME```
  - ```./scripts/createVersion.sh $TAG_NAME```
  - ```./scripts/deployVersion.sh $TAG_NAME $ENVIRONMENT```

Testing
-------
You can run the test framework on your localhost by installing selenium and mocha and then using the npm test.

  - ```npm install selenium-standalone@latest -g```
  - ```selenium-standalone install```
  - ```selenium-standalone start```

After running these commands, selenium will be installed with the chrome webdriver and started on port 4444 to receive requests. To run the tests type:

  - ```npm test```
