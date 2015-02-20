#!/bin/bash

cd src;

MEDIA_FILES=`find . \( -name '*.css' -o -name '*.png' \)`

# create all dirs where media files will land inside `dist/media`
# copy the media file into the destination folder
for MEDIA_FILE in $MEDIA_FILES
do
  mkdir -p `dirname "../dist/media/$MEDIA_FILE"`
  cp "$MEDIA_FILE" "../dist/media/$MEDIA_FILE"
done
