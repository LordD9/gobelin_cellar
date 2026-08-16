#!/bin/sh
set -e

mkdir -p /data

if [ "$(id -u)" = "0" ]; then
  chown -R node:node /data
  exec setpriv --reuid=node --regid=node --init-groups -- "$@"
fi

exec "$@"
