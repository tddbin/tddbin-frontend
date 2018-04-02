#!/bin/bash

if [ -z "${KATAS_SERVICE_DOMAIN:+x}" ]; then
  echo "Can not build. Environment variable 'KATAS_SERVICE_DOMAIN' must be set";
  exit 1;
fi;

# TODO: must be run from project root (i am sure this is not bash best pratice)

ORIGIN_ROOT="."
DIST_ROOT="$ORIGIN_ROOT/dist"
DIST_MOCHA_DIR="$DIST_ROOT/mocha"
DIST_JASMINE_DIR="$DIST_ROOT/jasmine"
DIST_KATAS_DIR="$DIST_ROOT/katas"

# clean up
rm -Rf $DIST_ROOT;

# create build directory (structure)
mkdir -p $DIST_MOCHA_DIR;
mkdir -p $DIST_JASMINE_DIR;
mkdir -p $DIST_KATAS_DIR;

# copy html assets
cp $ORIGIN_ROOT/src/_html/index.html $DIST_ROOT;
# replace place holder KATAS_SERVICE_DOMAIN with env var, so it can be different in dev/prod mode
if [[ $OSTYPE == darwin* ]]; then
  sed -i'' "s/\${KATAS_SERVICE_DOMAIN}/$KATAS_SERVICE_DOMAIN/g" $DIST_ROOT/index.html
  sed -i'' "s/\${GA_TRACKING_ID}/$GA_TRACKING_ID/g" $DIST_ROOT/index.html
  sed -i'' "s/\${GA_TRACKING_DOMAIN}/$GA_TRACKING_DOMAIN/g" $DIST_ROOT/index.html
else
  sed -i "s/\${KATAS_SERVICE_DOMAIN}/$KATAS_SERVICE_DOMAIN/g" $DIST_ROOT/index.html
  sed -i "s/\${GA_TRACKING_ID}/$GA_TRACKING_ID/g" $DIST_ROOT/index.html
  sed -i "s/\${GA_TRACKING_DOMAIN}/$GA_TRACKING_DOMAIN/g" $DIST_ROOT/index.html
fi;

cp $ORIGIN_ROOT/src/_html/favicon.ico $DIST_ROOT;
cp $ORIGIN_ROOT/src/test-runner/mocha/spec-runner.html $DIST_MOCHA_DIR;
cp $ORIGIN_ROOT/src/test-runner/jasmine/spec-runner.html $DIST_JASMINE_DIR;
cp $ORIGIN_ROOT/src/test-runner/katas/spec-runner.html $DIST_KATAS_DIR;

# run all build scripts, `&&` ensures to stop on any fail
(
  npm run build:app &&
  npm run build:css &&
  npm run build:ace &&
  npm run build:spec-runners
)
cp $ORIGIN_ROOT/CNAME $DIST_ROOT/CNAME;
