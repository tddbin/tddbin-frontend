#!/bin/bash

# TODO: must be run from project root (i am sure this is not bash best pratice)

ORIGIN_ROOT=".";
MEDIA_FILES_ORIGIN_DIR="$ORIGIN_ROOT/src/components";
DIST_ROOT="$ORIGIN_ROOT/dist";
MEDIA_DIST_ROOT="$DIST_ROOT/media";

mkdir -p "$MEDIA_DIST_ROOT"
cp $MEDIA_FILES_ORIGIN_DIR/*.css $MEDIA_DIST_ROOT
cp -r $MEDIA_FILES_ORIGIN_DIR/img $MEDIA_DIST_ROOT
