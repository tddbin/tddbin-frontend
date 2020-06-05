#!/bin/bash

ORIGIN_ROOT="."
DIST_ROOT="$ORIGIN_ROOT/dist"

cp -r $ORIGIN_ROOT/vendor $DIST_ROOT;

# replace online refs using offline-refs (so I can work offline too)
  # replace in index.html
  sed -i'' \
      -e "s|//cdn.jsdelivr.net/npm|../vendor|g" \
      -e "s|@|/|g" \
    $DIST_ROOT/index.html
  # replace in spec-runners
  sed -i'' "s/\/\/cdnjs.cloudflare.com\/ajax\/libs/..\/vendor/g" $DIST_ROOT/mocha/spec-runner.html
  sed -i'' "s/\/\/cdnjs.cloudflare.com\/ajax\/libs/..\/vendor/g" $DIST_ROOT/jasmine/spec-runner.html
