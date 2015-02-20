#!/bin/bash

npm run build-html
npm run build-app
npm run build-css
npm run build-ace
npm run build-spec-runners
cp CNAME dist/CNAME
