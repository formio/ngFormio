#!/usr/bin/env bash
# This file is for testing purposes only. It tests out the result of TAG_NAME given different CIRCLE_BRANCH inputs.

CIRCLE_BRANCH=$1
export CIRCLE_SHA1=abc123
echo "CIRCLE_SHA1:$CIRCLE_SHA1"
export SHORT_SHA=$(echo $CIRCLE_SHA1 | cut -b1-7)
echo "SHORT_SHA:$SHORT_SHA"
export BRANCH=$(echo $CIRCLE_BRANCH | sed -E "s/\//-/g")
echo "BRANCH:$BRANCH"
export RELEASE_REGEX=$(echo $BRANCH | sed -E "s/release-([a-zA-Z0-9\._]*).*/\1/" | sed -E "s/x/*/g")
echo "RELEASE_REGEX:$RELEASE_REGEX"
export LAST_RELEASE=$(git tag -l $RELEASE_REGEX | tail -n 1)
echo "LAST_RELEASE:$LAST_RELEASE"
export SEMVER=$(if [ -z $LAST_RELEASE ]; then echo $RELEASE_REGEX | sed -E "s/\*/0/g"; else ./scripts/incrementVersion.sh -p $LAST_RELEASE; fi)
echo "SEMVER:$SEMVER"
export TAG_NAME=$(if [[ $SEMVER =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then echo $SEMVER; else echo "$BRANCH-$SHORT_SHA"; fi)
echo "TAG_NAME:$TAG_NAME"

