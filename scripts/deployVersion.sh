#!/usr/bin/env bash

CURDIR=$(pwd)
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && cd .. && pwd )
# Get the tag name from a parameter to the script.
TAG_NAME=$1
# Get the environment from a parameter to the script.
ENVIRONMENT=$2

APPLICATION_NAME=form.io
ENVIRONMENT_CONFIG=DevConfig
HOSTED_ZONE_ID=Z1ESX4S80S93OG
MONGO_SERVER=ec2-52-25-221-252.us-west-2.compute.amazonaws.com
MONGO_PORT=27017
MONGO1=mongodb://$MONGO_SERVER:$MONGO_PORT/$ENVIRONMENT
EB_BUCKET=formio-ecs-bucket
AWSDIR=aws-eb

# Don't allow deploying to production. Sanity check.
if [ $ENVIRONMENT == "prod" ]; then
  echo "Deploying to production is not allowed with this script."
#  exit 1;
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
  aws elasticbeanstalk create-environment --application-name $APPLICATION_NAME --environment-name $ENVIRONMENT --version-label $TAG_NAME --template-name $ENVIRONMENT_CONFIG  --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=MONGO1,Value=$MONGO1 \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=DOMAIN,Value=$ENVIRONMENT.test-form.io

  # Wait for the load balancer to be initialized. We can't create the dns resource record until it is.
  echo "Waiting for the load balancer to be initialized."
  for a in {1..100}
  do
    LOAD_BALANCER=`aws elasticbeanstalk describe-environment-resources --environment-name $ENVIRONMENT --query 'EnvironmentResources.LoadBalancers[0].Name' --output text`
    if [[ $LOAD_BALANCER != 'None' ]]; then
      echo "$LOAD_BALANCER"
      break
    fi
    echo -n "$a "
    sleep 5
  done
  DNS_NAME=`aws elb describe-load-balancers --load-balancer-names $LOAD_BALANCER --query 'LoadBalancerDescriptions[0].CanonicalHostedZoneName' --output text`
  ALIAS_ZONE=`aws elb describe-load-balancers --load-balancer-names $LOAD_BALANCER --query 'LoadBalancerDescriptions[0].CanonicalHostedZoneNameID' --output text`
  sed -e "s/<ENVIRONMENT>/$ENVIRONMENT/" -e "s/<DNS_NAME>/$DNS_NAME/" -e "s/<ALIAS_ZONE>/$ALIAS_ZONE/" < $AWSDIR/DNSAdd.json > $AWSDIR/versions/$TAG_NAME/DNSAdd.json
  echo "Adding recordset for $ENVIRONMENT.form.io."
  aws route53 change-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --change-batch file://$DIR/$AWSDIR/versions/$TAG_NAME/DNSAdd.json

   ssh $MONGO_SERVER "~/restore.sh $ENVIRONMENT"
else
  echo "Existing environment found. Updating application version to $TAG_NAME."
  aws elasticbeanstalk update-environment --environment-name $ENVIRONMENT --version-label $TAG_NAME
fi

