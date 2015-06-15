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
   -g      Install git submodules
   -n      Install node modules
   -b      Install bower components
   -a      Do everything
   -f      Force (y) to all questions
   -v      Verbose
EOF
}

DELETE=false
GIT=false
NODE=false
BOWER=false
FORCE=false
while getopts "hdgnbaf" OPTION; do
  case $OPTION in
    h)
      usage
      exit 1
      ;;
    d)
      DELETE=true
      ;;
    g)
      GIT=true
      ;;
    n)
      NODE=true
      ;;
    b)
      BOWER=true
      ;;
    a)
      DELETE=true
      GIT=true
      NODE=true
      BOWER=true
      ;;
    f)
      FORCE=true
      ;;
    ?)
      usage
      ;;
  esac
done

if [[ -z $GIT ]] && [[ -z $NODE ]] && [[ -z $BOWER ]]; then
   usage
   exit 1
fi

cd $DIR
if $DELETE; then
  if !$FORCE; then
    echo "This will remove sub component repositories. You should commit and push any outstanding changes to github."
    read -p "Are you sure you want to do a full rebuild? " -n 1 -r
    echo    # (optional) move to a new line
    if [[ ! $REPLY =~ ^[Yy]$ ]]
    then
        exit 1
    fi
  fi
  echo "Removing node_modules"
  rm -rf node_modules
  echo "Removing bower_components"
  rm -rf bower_components
fi

if $GIT; then
  echo "Installing git submodules"
  git submodule update --init --recursive
fi

if $NODE; then
  echo "Installing node modules"
  npm install
  cd node_modules/formio
  npm install
  cd $DIR
  cd bower_components/formio
  npm install
  cd $DIR
fi

if $BOWER; then
  echo "Installing bower components"
  npm install -g bower
  bower install --allow-root
  cd bower_components/ngFormBuilder
  npm install
  cd $DIR
fi

# Go back to the original directory if it is different than the script root.
cd $CURDIR
