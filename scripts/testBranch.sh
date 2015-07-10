#!/usr/bin/env bash
# This file is for testing purposes only. It tests out the result of TAG_NAME given different CIRCLE_BRANCH inputs.

CIRCLE_BRANCH=$1
CIRCLE_SHA1=abc123
echo "CIRCLE_SHA1:$CIRCLE_SHA1"
SHORT_SHA=$(echo $CIRCLE_SHA1 | cut -b1-7)
echo "SHORT_SHA:$SHORT_SHA"
RELEASE_REGEX=$(echo $CIRCLE_BRANCH | sed -E "s/release\/([a-zA-Z0-9\._]*).*/\1/" | sed -E "s/x/*/g")
echo "RELEASE_REGEX:$RELEASE_REGEX"
LAST_RELEASE=$(git tag -l $RELEASE_REGEX | tail -n 1)
echo "LAST_RELEASE:$LAST_RELEASE"
SEMVER=$(if [ -z $LAST_RELEASE ]; then echo $RELEASE_REGEX | sed -E "s/\*/0/g"; else ./scripts/incrementVersion.sh -p $LAST_RELEASE; fi)
echo "SEMVER:$SEMVER"
TAG_NAME=$(if [[ $SEMVER =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then echo $SEMVER; else echo "$CIRCLE_BRANCH-$SHORT_SHA" | sed -E "s/\//-/g"; fi)
echo "TAG_NAME:$TAG_NAME"

