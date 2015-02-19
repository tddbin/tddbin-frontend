#!/bin/bash

cd src;

# create all dirs where CSS files will land inside `dist/css`
find . \( -name '*.css' -o -name '*.png' \) | xargs -I{} dirname {} | xargs -I{} mkdir -p "../dist/media/{}" ;
# copy all *.css files from `src` into `dist/css`
find . \( -name '*.css' -o -name '*.png' \) | xargs -I{} cp "{}" "../dist/media/{}" ;
