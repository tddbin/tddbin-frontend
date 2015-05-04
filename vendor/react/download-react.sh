#!/usr/bin/env bash

CUR_DIR=.
REACT_VERSION=$1
DESTINATION_DIR=$CUR_DIR/$REACT_VERSION/

if [ $# -eq 0 ]; then
  echo "Please give an REACT version number to download, like '0.13.2'"
  exit
fi

if [ -d "$DESTINATION_DIR" ]; then
  echo "Not downloading!"
  echo "Directory '$DESTINATION_DIR' exists already. Most probably REACT version $REACT_VERSION had already been downloaded!"
  exit
fi

mkdir -p $DESTINATION_DIR
cd "$DESTINATION_DIR"

wget "http://cdnjs.cloudflare.com/ajax/libs/react/$REACT_VERSION/react-with-addons.min.js"
