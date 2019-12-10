#!/usr/bin/env bash

set -e

DOCKERFILE_HASH=$(md5 -q ./Dockerfile)
CONTAINER_NAME=tddbin
IMAGE_NAME=${CONTAINER_NAME}-image:${DOCKERFILE_HASH}
PORT=9778

if [[ $(docker inspect --format . ${IMAGE_NAME} 2>&1) != "." ]]; then
  echo "--- BUILDING image '${IMAGE_NAME}' ---"
  docker build -t ${IMAGE_NAME} -f Dockerfile .
fi

echo "--- RUNNING container '${CONTAINER_NAME}' ---"
docker run --rm \
	--name ${CONTAINER_NAME} \
	--publish 8080:${PORT} \
	--volume $(pwd):/app \
	--env "KATAS_SERVICE_URL=http://katas.tddbin.local/" \
	${IMAGE_NAME} $1