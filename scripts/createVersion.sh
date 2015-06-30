#!/usr/bin/env bash

# Create new application version
echo "Creating $TAG_NAME.zip file."
mkdir -p $AWSDIR/versions/$TAG_NAME
sed "s/<TAG>/$TAG_NAME/" < $AWSDIR/Dockerrun.aws.json > $AWSDIR/versions/$TAG_NAME/Dockerrun.aws.json
mkdir -p $AWSDIR/versions/$TAG_NAME/.ebextensions
sed -e "s/<MONGO1>/$(echo $MONGO1 | sed -e 's/[\/&]/\\&/g')/" -e "s/<ENVIRONMENT>/$ENVIRONMENT/" < $AWSDIR/.ebextensions/app.config > $AWSDIR/versions/$TAG_NAME/.ebextensions/app.config
cd $AWSDIR/versions/$TAG_NAME
zip -r ../$TAG_NAME.zip * .ebextensions/*
cd ../../..
echo "Uploading $AWSDIR/versions/$TAG_NAME.zip to s3://$EB_BUCKET/$TAG_NAME.zip"
aws s3 cp $AWSDIR/versions/$TAG_NAME.zip s3://$EB_BUCKET/$TAG_NAME.zip

echo "Creating application version $TAG_NAME."
aws elasticbeanstalk create-application-version --application-name $APPLICATION_NAME --version-label $TAG_NAME --source-bundle S3Bucket=$EB_BUCKET,S3Key=$TAG_NAME.zip
