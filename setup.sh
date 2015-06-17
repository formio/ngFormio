#! /bin/bash
# Save the original current directory so we can return to it at the end of the script.
CURDIR=$(pwd)
# Get the directory of this script. Use its location as the root of where we run things.
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

# Function to print out how to use this script.
usage() {
cat << EOF
usage: $0 options

This script will install required repositories and libraries.

OPTIONS:
   -h      Show this message
   -d      Delete existing node_modules and bower_components
   -s      Install git submodules
   -n      Install node modules
   -b      Install bower components
   -a      Do everything
   -g      Run gulp build
EOF
}

DELETE=
GIT=
NODE=
BOWER=
FORCE=
GULP=
while getopts "hdsnbag" OPTION; do
  case $OPTION in
    h)
      usage
      exit 1
      ;;
    d)
      DELETE=1
      ;;
    s)
      GIT=1
      ;;
    n)
      NODE=1
      ;;
    b)
      BOWER=1
      ;;
    g)
      GULP=1
      ;;
    a)
      DELETE=1
      GIT=1
      NODE=1
      BOWER=1
      GULP=1
      ;;
    ?)
      usage
      ;;
  esac
done

# By default, do everything.
if [[ -z $DELETE ]] && [[ -z $GIT ]] && [[ -z $NODE ]] && [[ -z $BOWER ]] && [[ -z $GULP ]]; then
echo "$GIT"
      DELETE=1
      GIT=1
      NODE=1
      BOWER=1
      GULP=1
fi

cd $DIR
if [ $DELETE ]; then
  echo "Removing node_modules"
  (GLOBIGNORE='node_modules/formio'; rm -rf node_modules/*)
  rm -rf node_modules/formio/node_modules
  rm -rf bower_components/formio/node_modules
  rm -rf bower_components/ngFormBuilder/node_modules
  echo "Removing bower_components"
  (GLOBIGNORE='bower_components/formio:bower_components/ngFormBuilder'; rm -rf bower_components/*)
  echo "Removing build directory"
  rm -rf dist
fi

if [ $GIT ]; then
  echo "Updating git submodules"
  git submodule update --init --recursive
fi

if [ $NODE ]; then
  echo "Installing node modules"
  npm cache clean
  npm install
  cd node_modules/formio
  npm install
  cd $DIR
  cd bower_components/formio
  npm install
  cd $DIR
fi

if [ $BOWER ]; then
  echo "Installing bower components"
  npm install -g bower
  bower install --allow-root -s
  cd bower_components/ngFormBuilder
  npm install
  cd $DIR
fi

if [ $GULP ]; then
  echo "Building site"
  npm install -g gulp
  gulp build
  cd $DIR
fi

# Go back to the original directory if it is different than the script root.
cd $CURDIR
