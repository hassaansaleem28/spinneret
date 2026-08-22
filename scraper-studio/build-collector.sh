#!/usr/bin/env bash
# Spinneret — collector build driver.
# Usage: ./build-collector.sh <slug> <url> <description>
# Emits the {collector_id,name,status} envelope to logs/<slug>.create.json
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ../.env.local; set +a
slug="$1"; url="$2"; desc="$3"
echo "[$(date -Is)] creating '$slug' -> $url"
npx -p @brightdata/cli bdata scraper create "$url" "$desc" \
  --name "spinneret-$slug" --pretty --timeout 1500 \
  -o "logs/$slug.create.json" 2>&1 | grep -v "npm notice" || true
echo "[$(date -Is)] done '$slug'"
