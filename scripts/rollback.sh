#!/usr/bin/env bash
set -Eeuo pipefail

release_id=${1:?usage: rollback.sh release-id}
base=/opt/sdlc-demo
release_dir="$base/releases/$release_id"
test -d "$release_dir"
ln -sfn "$release_dir" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"
systemctl restart sdlc-demo.service
curl --fail --silent --show-error http://127.0.0.1:8080/healthz
printf '\nRolled back to %s\n' "$release_id"
