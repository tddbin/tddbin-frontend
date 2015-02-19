#!/bin/bash

# travis does a `git checkout -qf <hash>` which detaches it from the branch
# and `git branch` would show `* (detached from <hash>)` but we want the line below
# of what `git branch` reports
CURRENT_BRANCH=$(git branch | sed -n -e 's/^\  \(.*\)/\1/p')

echo "deploy: current branch is '$CURRENT_BRANCH'"

if [ "$CURRENT_BRANCH" == "master" ]; then
  echo "deploy: build via 'npm run build'"
  npm run build
  echo "deploy: run 'deploy-to-ghpages.sh'"
  ./deploy-to-ghpages.sh
else
  echo "deploy: nothing to deploy. (only deploying master branch)"
fi
