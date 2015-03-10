#!/bin/bash

# TODO: must be run from project root (i am sure this is not bash best pratice)

ORIGIN_ROOT="."
DIST_ROOT="$ORIGIN_ROOT/dist"
DIST_MOCHA_DIR="$DIST_ROOT/mocha"
DIST_JASMINE_DIR="$DIST_ROOT/jasmine"

# clean up
rm -Rf $DIST_ROOT;

# create build directory (structure)
mkdir -p $DIST_MOCHA_DIR;
mkdir -p $DIST_JASMINE_DIR;

# copy html assets
cp $ORIGIN_ROOT/html/index.html $DIST_ROOT;
# replace place holder KATAS_SERVICE_DOMAIN with env var, so it can be different in dev/prod mode
sed -i '' "s/\${KATAS_SERVICE_DOMAIN}/$KATAS_SERVICE_DOMAIN/g" $DIST_ROOT/index.html

cp $ORIGIN_ROOT/html/favicon.ico $DIST_ROOT;
cp $ORIGIN_ROOT/src/test-runner/mocha/spec-runner.html $DIST_MOCHA_DIR;
cp $ORIGIN_ROOT/src/test-runner/jasmine/spec-runner.html $DIST_JASMINE_DIR;

# run all build scripts, `&&` ensures to stop on any fail
(
  npm run build-app &&
  npm run build-css &&
  npm run build-ace &&
  npm run build-spec-runners
)
cp $ORIGIN_ROOT/CNAME $DIST_ROOT/CNAME;
