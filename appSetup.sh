#!/usr/bin/env bash

npm install
bower install --allow-root -s -F
rm -rf bower_components/ngForm*
git submodule update --init --recursive
cd bower_components/ngFormBuilder
bower install
cd ../ngFormio
bower install
cd ../..
gulp
