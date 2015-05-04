#!/usr/bin/env bash

CUR_DIR=.
ACE_VERSION=$1
DESTINATION_DIR=$CUR_DIR/$ACE_VERSION/min

if [ $# -eq 0 ]; then
  echo "Please give an ACE version number to download, like '1.1.9'"
  exit
fi

if [ -d "$DESTINATION_DIR" ]; then
  echo "Not downloading!"
  echo "Directory '$DESTINATION_DIR' exists already. Most probably ACE version $ACE_VERSION had already been downloaded!"
  exit
fi

mkdir -p $DESTINATION_DIR
cd "$DESTINATION_DIR"

wget "http://cdn.jsdelivr.net/ace/$ACE_VERSION/min/ace.js"
wget "http://cdn.jsdelivr.net/ace/$ACE_VERSION/min/ext-language_tools.js"
wget "http://cdn.jsdelivr.net/ace/$ACE_VERSION/min/mode-javascript.js"
wget "http://cdn.jsdelivr.net/ace/$ACE_VERSION/min/worker-javascript.js"
