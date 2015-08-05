#!/usr/bin/env bash
# This file will return the correct tag based on the branch name and commit SHA.

# First check if this sha is already tagged.
TAG=$(git tag --points-at HEAD)
if [[ ! -z $TAG ]]; then
  echo $TAG
  exit
fi

# Create a tag.
RELEASE_REGEX=$(echo $CIRCLE_BRANCH | sed -E -e "s/release\/([a-zA-Z0-9\._]*).*/\1/" -e "s/x/*/g")
LAST_RELEASE=$(git tag -l $RELEASE_REGEX | xargs -I@ git log --format=format:"%ai @%n" -1 @ | sort | awk '{print $4}' | tail -n 1)
echo $LAST_RELEASE
SEMVER=$(if [ -z $LAST_RELEASE ]; then echo $RELEASE_REGEX | sed -E -e "s/\*/0/g"; else ./scripts/incrementVersion.sh -p $LAST_RELEASE; fi)
TAG=$(if [[ $SEMVER =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then echo $SEMVER; else echo $CIRCLE_BRANCH-$SHORT_SHA | sed -E -e "s/\//-/g"; fi)
if [[ $SEMVER =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  git tag $TAG
  git push --tags
  echo $SEMVER
else
  SHORT_SHA=$(echo $CIRCLE_SHA1 | cut -b1-7)
  echo $CIRCLE_BRANCH-$SHORT_SHA | sed -E -e "s/[^a-zA-Z0-9\._]/_/g"
fi
