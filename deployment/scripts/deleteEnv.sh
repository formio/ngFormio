#!/usr/bin/env bash

# Get the environment from a parameter to the script.
ENVIRONMENT=$1
# Make sure we have values.
if [[ -z $ENVIRONMENT ]]; then
  echo "Include the tag name and environment as parameters."
  echo "Example: ./scripts/deleteEnv.sh ENVIRONMENT"
  exit 1
fi

# Don't allow deploying to production. Sanity check.
if [ $ENVIRONMENT == "prod" ]; then
  echo "Terminating production is not allowed with this script."
  exit 1;
fi

aws elasticbeanstalk terminate-environment --environment-name $ENVIRONMENT

# Need to delete route53 recordsets. That requires writing and sending a file.
# Need to delete database from mongodev.
