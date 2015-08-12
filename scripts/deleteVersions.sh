#!/usr/bin/env bash

# Get the environment from a parameter to the script.
ENVIRONMENT=$1
# Make sure we have values.
if [[ -z $ENVIRONMENT ]]; then
  echo "Include the tag name and environment as parameters."
  echo "Example: ./scripts/deleteVersions.sh ENVIRONMENT"
  exit 1
fi

VERSIONS=`aws elasticbeanstalk describe-applications --application-names form.io --query 'Applications[0].Versions' --output text | tr "\t" "\n" | grep $ENVIRONMENT`

for VERSION in $VERSIONS; do
  echo "Deleting $VERSION"
  aws elasticbeanstalk delete-application-version --application-name form.io --version-label $VERSION
done

# Need to delete from docker hub as well.
