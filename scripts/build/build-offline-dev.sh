#!/bin/bash

ORIGIN_ROOT="."
DIST_ROOT="$ORIGIN_ROOT/dist"

cp -r $ORIGIN_ROOT/vendor $DIST_ROOT;
cp $ORIGIN_ROOT/html/index-offline.html $DIST_ROOT;
