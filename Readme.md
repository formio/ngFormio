http://form.io main application.
================================
This repository is the main application for the Form.IO project which brings in the separate components into a single
executable for the whole https://form.io system. The main components that are included are as follows.

 - **ngFormio** @ /bower_components/formio - The Form.IO renderer - https://github.com/formioapp/ngFormio
 - **ngFormBuilder** @ /bower_components/ngFormBuilder - The Form.IO form builder - https://github.com/formioapp/ngFormBuilder
 - **formio** @ /node_modules/formio - The Form.IO core server - https://github.com/formioapp/formio
 
Installation (Docker)
------------
In order to install and run this application with docker, you will need to download and install.

  - boot2docker: https://github.com/boot2docker/osx-installer/releases/latest
  - virtualbox: https://www.virtualbox.org/wiki/Downloads
  
Next, open a terminal window and type the following to initialize boot2docker

  - ```boot2docker up```
  - ```boot2docker init```
  - ```$(boot2docker shellinit)```
  
In the future, if you get an error about unable to connect to docker, run the shellinit again. You may want to add the variables to your .profile.

Next, start up a mongodb server in docker with the following commands.

  - ```mkdir /opt/lib/mongodb``` (This is where the data will live).
  - ```docker run --name mongo-server -p 27017 -d mongo -v /opt/lib/mongodb:/data/db```
  - ```npm install -g bower```
  
In this docker command, we are downloading and running a mongodb instance.
 
  - --name mongo-server will name the server.
  - -p 27017 will map the port to your computer so you can directly access mongodb.
  - -d will daemonize it so it will run in the background.
  - mongo is the name of the docker image to use from docker hub.
  - -v /opt/lib/mongodb:/data/db will map the drive on your local machine to inside the container so the data persists even if the container is destroyed.
  
Next, we will run the formio-app server.

  - ```docker run --name formio-app -p 80:3000 --link mongo-server:mongo -d formio/node-server -v $(pwd):/src```
  - ```docker exec formio-app cd /src; rm -rf node_modules; npm install; npm install -g bower```
  - ```docker exec formio-app cd /src; rm -rf bower_components; bower install --allow-root```
  
We need to redownload all node_modules since some are compiled for the mac and won't run within the docker container.  Port 80 in the container is mapped to port 3000 so the url http://localhost:3000 should now be running the node app.  --link will automatically link the mongodb instance with the correct environment variables so the container knows how to use it. -v will replace the existing /src dir with a link to your current code directory so any changes are immediately seen within the app.

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

Next, use the setup.sh script to run npm and bower install, and update the submodules.

  - ```./script.sh -bng```
  
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

You should now be able to see the form.io application @ http://localhost:9002.
  
With these watches running, you can now make changes directly within the formio and ngFormBuilder
bower_components and those changes will be immediately reflected on the browser. You can then 
check in any changes to the bower_components since each of these are simply a submodule of the
base formio-app.

Contributing
----------------
Before you contribute your code to this repository, make sure you compile the project by typing the following in the terminal.

```
gulp build
```

Then run the project using ```node server``` and then test the project @ https://localhost:3000 before committing your code to a pull request.
