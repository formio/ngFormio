#!/usr/bin/env bash

DB=$1
EB_BUCKET=formiobot-docker
FILE=formio.tgz

aws s3 cp s3://$EB_BUCKET/$FILE .
tar -xzvf $FILE
mongorestore --db $DB formio/develop
