http://form.io main application.
================================
This repository is the main application for the Form.IO project which brings in the separate components into a single
executable for the app part of the website. It is designed to be compiled and run from a CDN but includes tools to run
locally as a node server or from gulp. You MUST be running a formio-server and connect to it or the site will not work.

 - **ngFormio** @ /bower_components/ngFormio - The Form.IO renderer - https://github.com/formio/ngFormio
 - **ngFormBuilder** @ /bower_components/ngFormBuilder - The Form.IO form builder - https://github.com/formio/ngFormBuilder

Installation (Manual)
------------
In order to install and run this application, you will first need to install Node.JS, Gulp, and Bower. In addition, you
you will need to run the formio-server, preferably on port 3000. See https://github.com/formio/formio-server for
instructions on running it.

  - ```brew install node```
  - ```npm install -g bower```
  - ```npm install -g gulp```

Next, install dependencies.

  - ```bower install```
  - ```npm install```
  - ```git submodule update --init --recursive```

Next, build the site.

  - ```gulp build```

You can configure which port to run the app server on by creating a .env file and putting PORT=3001 in it.

You should then be able to run the application locally by typing.

  - ```node app```

You should then be able to go to http://localhost:3001 to see the https://form.io application.

Developing
------------
In order to develop against the application, you will need to utilize Gulp.

  - ```cd bower_components/ng-formio```
  - ```npm install```
  - ```gulp watch```

... create another terminal ...

  - ```cd bower_components/ng-formio-builder```
  - ```npm install```
  - ```gulp watch```

... create another terminal ...

  - ```gulp serve```

You should now be able to see the form.io application @ http://localhost:9002.

With these watches running, you can now make changes directly within the formio and ngFormBuilder
bower_components and those changes will be immediately reflected on the browser. You can then
check in any changes to the bower_components since each of these are simply a submodule of the
base formio-app.

Deployment
---------------
There are five steps that need to be run to deploy a new version.

  - ```./scripts/setup.sh -snb```
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
