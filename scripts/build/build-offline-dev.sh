#!/bin/bash

ORIGIN_ROOT="."
DIST_ROOT="$ORIGIN_ROOT/dist"

cp -r $ORIGIN_ROOT/vendor $DIST_ROOT;

# replace online refs using offline-refs (so I can work offline too)
if [[ $OSTYPE == darwin* ]]; then
  # replace in index.html
  sed -i'' "s/\/\/cdn.rawgit.com\/jpillora/..\/vendor/g" $DIST_ROOT/index.html
  sed -i'' "s/\/\/cdn.jsdelivr.net/..\/vendor/g" $DIST_ROOT/index.html
  sed -i'' "s/\/\/cdnjs.cloudflare.com\/ajax\/libs/..\/vendor/g" $DIST_ROOT/index.html
  # replace in spec-runners
  sed -i'' "s/\/\/cdnjs.cloudflare.com\/ajax\/libs/..\/vendor/g" $DIST_ROOT/mocha/spec-runner.html
  sed -i'' "s/\/\/cdnjs.cloudflare.com\/ajax\/libs/..\/vendor/g" $DIST_ROOT/jasmine/spec-runner.html
else
  echo "To do: make '$0' work on non-Macs";
  exit 1;
fi;
