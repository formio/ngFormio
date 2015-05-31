http://form.io main application.
================================
This repository is the main application for the Form.IO project which brings in the separate components into a single
executable for the whole https://form.io system. The main components that are included are as follows.

 - **ngFormio** @ /bower_components/formio - The Form.IO renderer - https://github.com/formioapp/ngFormio
 - **ngFormBuilder** @ /bower_components/ngFormBuilder - The Form.IO form builder - https://github.com/formioapp/ngFormBuilder
 - **formio** @ /node_modules/formio - The Form.IO core server - https://github.com/formioapp/formio
 
Installation
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

Next, you will then run npm and bower install, and then Update the submodules.

  - ```npm install```
  - ```bower install```
  - ```git submodule update --init --recursive```
  - ```cd node_modules/formio```
  - ```npm install```
  
You should then be able to run the application locally by typing.

  - ```node server```
  
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
  
With these watches running, you can now make changes directly within the formio and ngFormBuilder
bower_components and those changes will be immediately reflected on the browser. You can then 
check in any changes to the bower_components since each of these are simply a submodule of the
base formio-app.
