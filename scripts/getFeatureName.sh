#!/usr/bin/env bash

FEATURE_ID=$(echo $CIRCLE_BRANCH | sed -E -e "s/^feature\/((fa|FA)-[0-9]*).*$/\1/")
echo $FEATURE_ID | sed -E -e "s/[^a-zA-Z0-9-]//g"
