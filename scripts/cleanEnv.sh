#!/usr/bin/env bash

# Using docker on servers tends to fill up the free space on the server with old releases. This script will find
# all servers in an environment and clean up old releases.

ENVIRONMENT=$1

# Make sure we have values.
if [[ -z $ENVIRONMENT ]]; then
  echo "Include the environment as a parameter."
  echo "Example: ./scripts/cleanDocker.sh ENVIRONMENT"
  exit 1
fi

INSTANCES=`aws elasticbeanstalk describe-environment-resources --environment-name $ENVIRONMENT --query 'EnvironmentResources.Instances' --output text`

for INSTANCE in $INSTANCES; do
  PUBLICDNS=`aws ec2 describe-instances --instance-id $INSTANCE --query 'Reservations[0].Instances[0].NetworkInterfaces[0].PrivateIpAddresses[0].Association.PublicDnsName' --output text`
  ssh ec2-user@$PUBLICDNS -t -oStrictHostKeyChecking=no 'sudo docker images -a -q |xargs sudo docker rmi'
done
