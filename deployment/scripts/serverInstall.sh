#!/usr/bin/env bash

npm install
git submodule update --init --recursive
cd node_modules/formio
npm install
