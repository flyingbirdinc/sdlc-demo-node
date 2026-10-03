#!/usr/bin/env bash
set -Eeuo pipefail

artifact=${1:?usage: deploy.sh /path/to/release.tgz release-id}
release_id=${2:?usage: deploy.sh /path/to/release.tgz release-id}
base=/opt/sdlc-demo
release_dir="$base/releases/$release_id"
previous=$(readlink -f "$base/current" 2>/dev/null || true)

mkdir -p "$base/releases"
rm -rf "$release_dir"
mkdir -p "$release_dir"
tar -xzf "$artifact" -C "$release_dir"
chown -R sdlc-app:sdlc-app "$release_dir"
ln -sfn "$release_dir" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"

if ! systemctl restart sdlc-demo.service; then
  ln -sfn "$previous" "$base/current.next"
  mv -Tf "$base/current.next" "$base/current"
  systemctl restart sdlc-demo.service || true
  exit 1
fi

if ! curl --fail --silent --show-error http://127.0.0.1:8080/healthz; then
  ln -sfn "$previous" "$base/current.next"
  mv -Tf "$base/current.next" "$base/current"
  systemctl restart sdlc-demo.service || true
  exit 1
fi

find "$base/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | tail -n +6 | cut -d' ' -f2- | xargs -r rm -rf
printf '\nDeployed %s\n' "$release_id"
