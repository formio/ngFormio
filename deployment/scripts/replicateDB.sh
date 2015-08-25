# Note: This file is NOT automatically deployed. It is here for reference purposed and must be manually placed on the mongo-dev server.
#!/usr/bin/env bash

PROD_SERVER=ec2-xxx-xxx-xxx-xxx.us-west-2.compute.amazonaws.com
PROD_PORT=27000
PROD_DB=formio
MONGO_DEV_USERNAME=
MONGO_DEV_PASSWORD=
BACKUP_DIR=~/backups
TIMESTAMP=$( date +"%Y-%m-%d_%H-%M-%S" )

ENVIRONMENT=$1

# Make sure we have a value.
if [[ -z $ENVIRONMENT ]]; then
  echo "You musst specify the environment to restore to."
  echo "Example: ./restore.sh ENVIRONMENT"
  exit 1
fi

mkdir $BACKUP_DIR
echo "Dumping out production database."
mongodump --host $PROD_SERVER --port $PROD_PORT --db $PROD_DB --out $BACKUP_DIR/$PROD_DB-$TIMESTAMP
echo "Restoring to $ENVIRONMENT."
mongorestore --username $MONGO_DEV_USERNAME --password $MONGO_DEV_PASSWORD --authenticationDatabase admin --drop --db $ENVIRONMENT $BACKUP_DIR/$PROD_DB-$TIMESTAMP/$PROD_DB
echo "Removing dump files."
