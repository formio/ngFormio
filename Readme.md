http://form.io main application.
================================
This repository is the main application for the Form.IO project which brings in the separate components into a single
executable for the whole https://form.io system. The main components that are included are as follows.

 - **ngFormio** @ /bower_components/formio - The Form.IO renderer - https://github.com/formio/ngFormio
 - **ngFormBuilder** @ /bower_components/ngFormBuilder - The Form.IO form builder - https://github.com/formio/ngFormBuilder
 
Installation (Manual)
------------
In order to install and run this application, you will first need to install Node.JS, Gulp, Bower, and MongoDB.

  - ```brew install node```
  - ```brew install mongodb```
  - ```npm install -g bower```
  - ```npm install -g gulp```
  
Next, you will need to run MongoDB.

  - ```mongod```

Next, get a database backup, and then do the following.
 - Unzip the database so that it is a folder of BSON files.
 - ```mongorestore --db formio formio```

Next, install dependencies.

  - ```bower install```
  - ```npm install```
  
You should then be able to run the application locally by typing.

  - ```node app```
  
You should then be able to go to http://localhost:3000 to see the https://form.io application.

Developing
------------
In order to develop against the application, you will need to utilize Gulp.

  - ```cd bower_components/formio```
  - ```npm install```
  - ```gulp watch```
  
... create another terminal ...
  
  - ```cd bower_components/ngFormBuilder```
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

  - ```brew install selenium-server-standalone```
  - ```brew install chromedriver```
  - ```npm install -g mocha```
  - ```ln -sfv /usr/local/opt/selenium-server-standalone/*.plist ~/Library/LaunchAgents```
  - ```launchctl load ~/Library/LaunchAgents/homebrew.mxcl.selenium-server-standalone.plist```
  - ```ln -sfv /usr/local/opt/chromedriver/*.plist ~/Library/LaunchAgents```
  - ```launchctl load ~/Library/LaunchAgents/homebrew.mxcl.chromedriver.plist```
  
After running these commands, selenium will be installed with the chrome webdriver and started on port 4444 to recieve requests. To run the tests type:

  - ```npm test```
