#!/usr/bin/env bash
set -euo pipefail

HUB_URL="${HUB_URL:-http://127.0.0.1:1337}"
ACTION="${1:-scan}"

print_json() {
  python3 -m json.tool
}

scan_use_cases() {
  local limit="${2:-20}"
  curl -fsS "${HUB_URL}/api/hermes/use-cases/scan?limit=${limit}" | print_json
}

list_presets() {
  curl -fsS "${HUB_URL}/api/hermes/use-cases/presets" | print_json
}

connectivity_scan() {
  curl -fsS "${HUB_URL}/api/tools/connectivity" | print_json
}

ensure_bridge() {
  curl -fsS -X POST "${HUB_URL}/api/tools/ensure-bridge" | print_json
}

apply_preset() {
  local preset="${2:-viral-youtube-flywheel}"
  local channel_name="${CHANNEL_NAME:-Lux Viral Labs}"
  local niche="${NICHE:-AI automation and creator workflows}"
  local voice="${VOICE:-clear, tactical, high-energy}"
  local cta="${CTA:-Subscribe for practical AI growth systems}"
  local offer="${OFFER:-newsletter + consulting funnel}"

  python3 - <<PY | curl -fsS -X POST "${HUB_URL}/api/hermes/use-cases/apply" -H "Content-Type: application/json" -d @- | print_json
import json
payload = {
    "preset_id": "${preset}",
    "auto_apply_cron": True,
    "profile": {
        "channel_name": "${channel_name}",
        "niche": "${niche}",
        "voice": "${voice}",
        "cta": "${cta}",
        "offer": "${offer}",
    },
}
print(json.dumps(payload))
PY
}

case "${ACTION}" in
  scan)
    scan_use_cases "$@"
    ;;
  presets)
    list_presets
    ;;
  apply)
    apply_preset "$@"
    ;;
  connect)
    connectivity_scan
    ;;
  bridge)
    ensure_bridge
    ;;
  *)
    cat <<'EOF'
Usage:
  ./Hermes-UseCase-Scanner.sh scan [limit]
  ./Hermes-UseCase-Scanner.sh presets
  ./Hermes-UseCase-Scanner.sh apply [preset_id]
  ./Hermes-UseCase-Scanner.sh connect
  ./Hermes-UseCase-Scanner.sh bridge

Environment overrides for apply:
  CHANNEL_NAME, NICHE, VOICE, CTA, OFFER

Example:
  CHANNEL_NAME="My Channel" NICHE="AI business automation" ./Hermes-UseCase-Scanner.sh apply viral-youtube-flywheel
EOF
    exit 1
    ;;
esac
