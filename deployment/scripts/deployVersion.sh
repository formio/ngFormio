#!/usr/bin/env bash

CURDIR=$(pwd)
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && cd .. && pwd )
# Get the tag name from a parameter to the script.
TAG_NAME=$1
# Get the environment from a parameter to the script.
ENVIRONMENT=$2

# Don't allow deploying to production. Sanity check.
if [ $ENVIRONMENT == "prod" ]; then
  echo "Deploying to production is not allowed with this script."
  exit 1;
fi

# Make sure we have values.
if [[ -z $TAG_NAME ]] || [[ -z $ENVIRONMENT ]]; then
  echo "Include the tag name and environment as parameters."
  echo "Example: ./scripts/deployVersion.sh TAG_NAME ENVIRONMENT"
  exit 1
fi

# Find out if the environment already exists.
EXISTS=`aws elasticbeanstalk describe-environments --environment-names $ENVIRONMENT --output text`

# Either create or update the environment to the new version.
if [[ -z $EXISTS ]]; then
  echo "No environment found. Creating new environment and setting application version to $TAG_NAME."
  ./scripts/createEnv.sh $ENVIRONMENT $TAG_NAME
else
  echo "Existing environment found. Updating application version to $TAG_NAME."
  ./scripts/cleanEnv.sh $ENVIRONMENT
  aws elasticbeanstalk update-environment --environment-name $ENVIRONMENT --version-label $TAG_NAME
fi

