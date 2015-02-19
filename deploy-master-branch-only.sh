#!/bin/bash

CURRENT_BRANCH=$(git symbolic-ref HEAD | sed -e 's,.*/\(.*\),\1,')

echo "deploy: current branch is '$CURRENT_BRANCH'"

if [ "$CURRENT_BRANCH" == "master" ]; then
  echo "deploy: build via 'npm run build'"
  npm run build
  echo "deploy: run 'deploy-to-ghpages.sh'"
  ./deploy-to-ghpages.sh
else
  echo "deploy: nothing to deploy. (only deploying master branch)"
fi
