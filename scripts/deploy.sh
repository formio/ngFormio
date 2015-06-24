#! /bin/bash

CURDIR=$(pwd)
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && cd .. && pwd )
# Get the tag name from a parameter to the script.
TAG_NAME=$1
# Get the environment from a parameter to the script.
ENVIRONMENT=$2
EB_BUCKET=formio-ecs-bucket
APPLICATION_NAME=form.io
ENVIRONMENT_CONFIG=DevConfig
HOSTED_ZONE_ID=ZITLBCTQPADKN
MONGO_SERVER=ec2-52-25-221-252.us-west-2.compute.amazonaws.com
MONGO1=mongodb://$MONGO_SERVER/$TAG_NAME
AWSDIR=aws-eb

# Don't allow deploying to production. Sanity check.
if [ $ENVIRONMENT == "prod" ]; then
  echo "Deploying to production is not allowed with this script."
  exit 1;
fi

# Make sure we have values.
if [[ -z $TAG_NAME ]] || [[ -z $ENVIRONMENT ]]; then
  echo "Include the tag name and environment as parameters."
  echo "Example: ./scripts/deploy.sh TAG_NAME ENVIRONMENT"
  exit 1
fi

# Create new application version
echo "Creating $TAG_NAME.zip file."
mkdir -p $AWSDIR/versions/$TAG_NAME
sed "s/<TAG>/$TAG_NAME/" < $AWSDIR/Dockerrun.aws.json > $AWSDIR/versions/$TAG_NAME/Dockerrun.aws.json
mkdir -p $AWSDIR/versions/$TAG_NAME/.ebextensions
sed "s/<MONGO1>/$(echo $MONGO1 | sed -e 's/[\/&]/\\&/g')/" < $AWSDIR/.ebextensions/app.config > $AWSDIR/versions/$TAG_NAME/.ebextensions/app.config
cd $AWSDIR/versions/$TAG_NAME
zip -r ../$TAG_NAME.zip * .ebextensions/*
cd ../../..
echo "Uploading $AWSDIR/versions/$TAG_NAME.zip to s3://$EB_BUCKET/$TAG_NAME.zip"
aws s3 cp $AWSDIR/versions/$TAG_NAME.zip s3://$EB_BUCKET/$TAG_NAME.zip

echo "Creating application version $TAG_NAME."
aws elasticbeanstalk create-application-version --application-name $APPLICATION_NAME --version-label $TAG_NAME --source-bundle S3Bucket=$EB_BUCKET,S3Key=$TAG_NAME.zip

# Find out if the environment already exists.
EXISTS=`aws elasticbeanstalk describe-environments --environment-names $ENVIRONMENT --output text`

# Either create or update the environment to the new version.
if [[ -z $EXISTS ]]; then
  echo "No environment found. Creating new environment and setting application version to $TAG_NAME."
  # TODO: Load the database here.
  aws elasticbeanstalk create-environment --application-name $APPLICATION_NAME --environment-name $ENVIRONMENT --version-label $TAG_NAME --template-name $ENVIRONMENT_CONFIG

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
else
  echo "Existing environment found. Updating application version to $TAG_NAME."
  aws elasticbeanstalk update-environment --environment-name formio-env --version-label $TAG_NAME
  # TODO: Should we reload the database each deploy?
fi

