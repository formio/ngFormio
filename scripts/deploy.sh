#! /bin/bash

# Get the tag name from a parameter to the script.
TAG_NAME=$1
# Get the environment from a parameter to the script.
ENVIRONMENT=$2
EB_BUCKET=formio-ecs-bucket
APPLICATION_NAME=form.io
ENVIRONMENT_CONFIG=DevConfig
MONGO_SERVER=ec2-52-25-221-252.us-west-2.compute.amazonaws.com
MONGO1=mongodb://$MONGO_SERVER/$TAG_NAME
DIR=aws-eb

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
mkdir -p $DIR/versions/$TAG_NAME
sed "s/<TAG>/$TAG_NAME/" < $DIR/Dockerrun.aws.json > $DIR/versions/$TAG_NAME/Dockerrun.aws.json
mkdir -p $DIR/versions/$TAG_NAME/.ebextensions
sed "s/<MONGO1>/$(echo $MONGO1 | sed -e 's/[\/&]/\\&/g')/" < $DIR/.ebextensions/app.config > $DIR/versions/$TAG_NAME/.ebextensions/app.config
cd $DIR/versions/$TAG_NAME
zip -r ../$TAG_NAME.zip * .ebextensions/*
cd ../../..
echo "Uploading $DIR/versions/$TAG_NAME.zip to s3://$EB_BUCKET/$TAG_NAME.zip"
aws s3 cp $DIR/versions/$TAG_NAME.zip s3://$EB_BUCKET/$TAG_NAME.zip

echo "Creating application version $TAG_NAME."
aws elasticbeanstalk create-application-version --application-name $APPLICATION_NAME --version-label $TAG_NAME --source-bundle S3Bucket=$EB_BUCKET,S3Key=$TAG_NAME.zip

# Find out if the environment already exists.
EXISTS=`aws elasticbeanstalk describe-environments --environment-names $ENVIRONMENT --output text`

# Either create or update the environment to the new version.
if [[ -z $EXISTS ]]; then
  echo "No environment found. Creating new environment and setting application version to $TAG_NAME."
  aws elasticbeanstalk create-environment --application-name $APPLICATION_NAME --environment-name $ENVIRONMENT --version-label $TAG_NAME --template-name $ENVIRONMENT_CONFIG
  # TODO: Probably need to load the database here.
else
  echo "Existing environment found. Updating application version to $TAG_NAME."
  aws elasticbeanstalk update-environment --environment-name formio-env --version-label $TAG_NAME
  # TODO: Should we reload the database each deploy?
fi

