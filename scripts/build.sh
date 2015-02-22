#!/bin/bash

BUILD_DIR=dist

rm -Rf $BUILD_DIR;
mkdir $BUILD_DIR;
cp html/index.html $BUILD_DIR;
cp html/favicon.ico $BUILD_DIR;
mkdir $BUILD_DIR/mocha/;
cp src/test-runner/mocha/spec-runner.html $BUILD_DIR/mocha

npm run build-app
npm run build-css
npm run build-ace
npm run build-spec-runners
cp CNAME dist/CNAME
