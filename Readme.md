http://form.io main application.
================================
This repository is the main server for the Form.IO project. There is no UI and the server is not designed to respond
without a subdomain in front of the domain. The main components that are included are as follows.

 - **formio** @ /node_modules/formio - The Form.IO core server - https://github.com/formio/formio
 
Installation (Docker)
------------
http://viget.com/extend/how-to-use-docker-on-os-x-the-missing-guide
In order to install and run this application with docker, you will need to download and install.

  - boot2docker: https://github.com/boot2docker/osx-installer/releases/latest
  - virtualbox: https://www.virtualbox.org/wiki/Downloads
  
Next, open a terminal window and type the following to initialize boot2docker

  - ```boot2docker init```
  - ```VBoxManage modifyvm "boot2docker-vm" --natpf1 "tcp-port27017,tcp,,27017,,27017"``` This will forward host port 27017 to the boot2docker vm.
  - ```VBoxManage modifyvm "boot2docker-vm" --natpf1 "tcp-port3000,tcp,,3000,,3000"``` This will forward host port 3000 to the boot2docker vm.
  - ```boot2docker start```
  - ```$(boot2docker shellinit)```
   
In the future, if you get an error about unable to connect to docker, run the shellinit again. You may want to add the variables to your ~/.bash_profile.

Next, start up a mongodb server in docker with the following command.

  - ```docker run --name mongo-server -p 27017:27017 -d mongo```
  
In this docker command, we are downloading and running a mongodb instance.
 
  - --name mongo-server will name the server.
  - -p 27017:27017 will map the port to the boot2docker-vm.
  - -d will daemonize it so it will run in the background.
  - mongo is the name of the docker image to use from docker hub.
  
You can control the mongo server with these commands.

  - ```docker start mongo-server```
  - ```docker stop mongo-server```

Next, get a database backup, and then do the following.

 - Unzip the database so that it is a folder of BSON files.
 - ```mongorestore --db formio formio```

Next, we will run the formio-app server. (This does not currently work because node packages need to be recompiled for linux).

  - ```./deployment/scripts/setup.sh -snbrg```
  - ```docker run --name formio-server -p 3000:80 --link mongo-server:mongo -d -v $(pwd):/src formio/formio-server```
  
This will redownload all node_modules since some are compiled for the mac and won't run within the docker container.  Port 80 in the container is mapped to port 3000 so the url http://localhost:3000 should now be running the node app.  --link will automatically link the mongodb instance with the correct environment variables so the container knows how to use it. -v will replace the existing /src dir with a link to your current code directory so any changes are immediately seen within the app.

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

  - ```cd scripts```
  - ```./deployment/scripts/setup.sh -bngs```
  
You should then be able to run the application locally by typing.

  - ```node server```

Deployment
---------------
There are five steps that need to be run to deploy a new version.

  - ```./deployment/scripts/setup.sh -snb```
  - ```docker build -t formio/formio-app:$TAG_NAME .```
  - ```docker push formio/formio-app:$TAG_NAME```
  - ```./scripts/createVersion.sh $TAG_NAME```
  - ```./scripts/deployVersion.sh $TAG_NAME $ENVIRONMENT```
