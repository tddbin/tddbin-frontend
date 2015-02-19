#!/bin/bash

# clean up
rm -rf tmp || exit 0;

# build
npm run build;

TMP_CHECKOUT_DIR=tmp/origin-gh-pages
(
  git clone --branch=gh-pages "https://${GH_TOKEN}@${GH_REF}" $TMP_CHECKOUT_DIR

  echo "deploy: checked out 'gh-pages' branch"
  rm -rf $TMP_CHECKOUT_DIR/*
  cp -r dist/* $TMP_CHECKOUT_DIR
  cd $TMP_CHECKOUT_DIR
  echo "deploy: configuring git user+email"
  git config user.name "Travis-CI"
  git config user.email "contact+travis-for-tddbin@uxebu.com"
  echo "deploy: adding files"
  git add .
  echo "deploy: committing"
  git commit -m "Travis deployed 'master' - `date`"
  echo "deploy: push back to gh-pages"
  git push "https://${GH_TOKEN}@${GH_REF}" gh-pages:gh-pages
)
