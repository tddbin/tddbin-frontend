#!/bin/bash

CURRENT_BRANCH=`git rev-parse --abbrev-ref HEAD`

if [ "$CURRENT_BRANCH" == "master" ]; then
  npm run build
  ./deploy-to-ghpages.sh
fi
