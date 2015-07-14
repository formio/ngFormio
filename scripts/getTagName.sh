#!/usr/bin/env bash
# This file will return the correct tag based on the branch name and commit SHA.

BRANCH=$1
echo $BRANCH
SHA=$2
echo SHA:$SHA
SHORT_SHA=$(echo $SHA | cut -b1-7)
echo SHORT_SHA:$SHORT_SHA
RELEASE_REGEX=$(echo $BRANCH | sed -E -e "s/release\/([a-zA-Z0-9\._]*).*/\1/" -e "s/x/*/g")
echo RELEASE_REGEX:$RELEASE_REGEX
LAST_RELEASE=$(git tag -l $RELEASE_REGEX | tail -n 1)
echo LAST_RELEASE:$LAST_RELEASE
SEMVER=$(if [ -z $LAST_RELEASE ]; then echo $RELEASE_REGEX | sed -E -e "s/\*/0/g"; else ./scripts/incrementVersion.sh -p $LAST_RELEASE; fi)
echo SEMVER:$SEMVER
export TAG_NAME1=$(if [[ $SEMVER =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then echo $SEMVER; else echo $BRANCH-$SHORT_SHA | sed -E -e "s/\//-/g"; fi)
echo TAG_NAME1:$TAG_NAME1

