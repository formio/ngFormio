#!/usr/bin/env bash

TAG_NAME=$1
EB_BUCKET=formio-ecs-bucket
AWSDIR=aws-eb
APPLICATION_NAME=form.io

# Make sure we have values.
if [[ -z $TAG_NAME ]]; then
  echo "Include the tag name and environment as parameters."
  echo "Example: ./scripts/createVersion.sh TAG_NAME"
  exit 1
fi

# Create new application version
echo "Creating $TAG_NAME.zip file."
mkdir -p $AWSDIR/versions/$TAG_NAME
sed "s/<TAG>/$TAG_NAME/" < $AWSDIR/Dockerrun.aws.json > $AWSDIR/versions/$TAG_NAME/Dockerrun.aws.json
mkdir -p $AWSDIR/versions/$TAG_NAME/.ebextensions
cp $AWSDIR/.ebextensions/app.config $AWSDIR/versions/$TAG_NAME/.ebextensions/app.config
cd $AWSDIR/versions/$TAG_NAME
zip -r ../$TAG_NAME.zip * .ebextensions/*
cd ../../..
echo "Uploading $AWSDIR/versions/$TAG_NAME.zip to s3://$EB_BUCKET/$TAG_NAME.zip"
aws s3 cp $AWSDIR/versions/$TAG_NAME.zip s3://$EB_BUCKET/$TAG_NAME.zip

echo "Creating application version $TAG_NAME."
aws elasticbeanstalk create-application-version --application-name $APPLICATION_NAME --version-label $TAG_NAME --source-bundle S3Bucket=$EB_BUCKET,S3Key=$TAG_NAME.zip
