#!/usr/bin/env bash
# Spinneret — collector run driver. Usage: ./run-collector.sh <slug> <collector_id> <url>
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ../.env.local; set +a
slug="$1"; cid="$2"; url="$3"
npx -p @brightdata/cli bdata scraper run "$cid" "$url" --pretty --timeout 900 \
  -o "logs/$slug.run.json" 2>&1 | grep -v "npm notice" || true
