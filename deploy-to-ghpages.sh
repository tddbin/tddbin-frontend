#!/bin/bash
rm -rf dist || exit 0;
mkdir dist;
npm run build;
( cd dist
 git init
 git config user.name "Travis-CI"
 git config user.email "contact+travis-for-tddbin@uxebu.com"
# cp ../CNAME ./CNAME
 git add .
 git commit -m "Deployed to Github Pages"
 git push --force --quiet "https://${GH_TOKEN}@${GH_REF}" master:gh-pages > /dev/null 2>&1
)
