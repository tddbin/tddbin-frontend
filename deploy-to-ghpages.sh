#!/bin/bash

# clean up
rm -rf tmp || exit 0;

# build
npm run build;

TMP_CHECKOUT_DIR=tmp/origin-gh-pages
(
  git clone --branch=gh-pages "https://${GH_TOKEN}@${GH_REF}" $TMP_CHECKOUT_DIR

  rm -rf $TMP_CHECKOUT_DIR/*
  cp -r dist/* $TMP_CHECKOUT_DIR
  cd $TMP_CHECKOUT_DIR
  git config user.name "Travis-CI"
  git config user.email "contact+travis-for-tddbin@uxebu.com"
  git add .
  git commit -m "Travis deployed 'master' - `date`"
  git push
)
