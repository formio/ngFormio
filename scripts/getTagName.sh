#!/usr/bin/env bash
# This file will return the correct tag based on the branch name and commit SHA.

BRANCH=$1
SHA=$2
SHORT_SHA=$(echo $SHA | cut -b1-7)
RELEASE_REGEX=$(echo $BRANCH | sed -E -e "s/release\/([a-zA-Z0-9\._]*).*/\1/" -e "s/x/*/g")
LAST_RELEASE=$(git tag -l $RELEASE_REGEX | tail -n 1)
SEMVER=$(if [ -z $LAST_RELEASE ]; then echo $RELEASE_REGEX | sed -E -e "s/\*/0/g"; else ./scripts/incrementVersion.sh -p $LAST_RELEASE; fi)
TAG_NAME=$(if [[ $SEMVER =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then echo $SEMVER; else echo $BRANCH-$SHORT_SHA | sed -E -e "s/\//-/g"; fi)
echo $TAG_NAME
