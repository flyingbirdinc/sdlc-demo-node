#!/usr/bin/env bash
set -Eeuo pipefail

artifact=${1:?usage: deploy.sh /path/to/release.tgz release-id}
release_id=${2:?usage: deploy.sh /path/to/release.tgz release-id}
base=/opt/sdlc-demo
release_dir="$base/releases/$release_id"
previous=$(readlink "$base/current" 2>/dev/null || true)
if [[ "$previous" == "$base/current" || -z "$previous" ]]; then
  previous=""
elif [[ "$previous" != /* ]]; then
  previous="$base/$previous"
fi

mkdir -p "$base/releases"
rm -rf "$release_dir"
mkdir -p "$release_dir"
tar -xzf "$artifact" -C "$release_dir"
if [[ ! -f "$release_dir/src/server.js" ]]; then
  printf 'release is missing src/server.js\\n' >&2
  rm -rf "$release_dir"
  exit 1
fi
chown -R sdlc-app:sdlc-app "$release_dir"
rm -f "$base/current.next"
ln -s "$release_dir" "$base/current.next"
rm -f "$base/current"
mv "$base/current.next" "$base/current"

if ! systemctl restart sdlc-demo.service; then
  if [[ -n "$previous" ]]; then
    rm -f "$base/current.next"
    ln -s "$previous" "$base/current.next"
    rm -f "$base/current"
    mv "$base/current.next" "$base/current"
  else
    rm -f "$base/current"
  fi
  systemctl restart sdlc-demo.service || true
  exit 1
fi

healthy=false
for _ in $(seq 1 20); do
  if curl --fail --silent --show-error http://127.0.0.1:8080/healthz; then
    healthy=true
    break
  fi
  sleep 1
done
if [[ "$healthy" != true ]]; then
  if [[ -n "$previous" ]]; then
    rm -f "$base/current.next"
    ln -s "$previous" "$base/current.next"
    rm -f "$base/current"
    mv "$base/current.next" "$base/current"
  else
    rm -f "$base/current"
  fi
  systemctl restart sdlc-demo.service || true
  exit 1
fi

find "$base/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | tail -n +6 | cut -d' ' -f2- | xargs -r rm -rf
printf '\nDeployed %s\n' "$release_id"
