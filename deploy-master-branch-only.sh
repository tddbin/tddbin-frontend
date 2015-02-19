#!/bin/bash

CURRENT_BRANCH=`git rev-parse --abbrev-ref HEAD`

echo "deploy: current branch is '$CURRENT_BRANCH'"

if [ "$CURRENT_BRANCH" == "master" ]; then
  echo "deploy: let's run the build"
  npm run build
  echo "deploy: run 'deploy-to-ghpages.sh'"
  ./deploy-to-ghpages.sh
else
  echo "deploy: nothing to deploy. (only deploying master branch)"
fi
