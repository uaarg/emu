#!/usr/bin/env bash
#
# Runs Shepard and Emu against the AEAC telemetry server at the same time.
#
#   Shepard (samples/atc_demo.py) streams fake telemetry at 1 Hz.
#   Emu's backend opens a second, listen-only connection and logs every
#   message it receives (traffic is hidden, it arrives every second).
#
# Usage:
#   scripts/run-atc-test.sh [--mock] [--sitl CONN] [TOKEN]
#
#   TOKEN       connection token from the AEAC Credentials page. If omitted, it is
#               read from $AEAC_CONNECTION_TOKEN, or prompted for (hidden input,
#               keeps it out of your shell history).
#   --mock      use Shepard's local mock server instead of the real one (no token needed)
#   --sitl CONN have Shepard read real telemetry from SITL, e.g. tcp:127.0.0.1:14550
#
# Env: SHEPARD_DIR (default: ../shepard next to this repo), EMU_PORT is fixed at 3000.
# Ctrl+C stops everything.

set -o errexit -o nounset -o pipefail

EMU_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHEPARD_DIR="${SHEPARD_DIR:-$(cd "$EMU_DIR/.." && pwd)/shepard}"
MOCK_URL="ws://127.0.0.1:8765/ws"

usage() { sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

mock=false
sitl=""
token="${AEAC_CONNECTION_TOKEN:-}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --mock) mock=true ;;
    --sitl) sitl="${2:?--sitl needs a connection string}"; shift ;;
    -h|--help) usage ;;
    -*) echo "Unknown option: $1" >&2; usage 1 ;;
    *) token="$1" ;;
  esac
  shift
done

if ! $mock && [[ -z "$token" ]]; then
  read -r -s -p "AEAC connection token: " token
  echo
fi
if ! $mock && [[ -z "$token" ]]; then
  echo "ERROR: a token is required (or use --mock)" >&2
  exit 1
fi
$mock && token="${token:-mock}"

# ---- Checks ----
[[ -d "$SHEPARD_DIR/src/modules/atc" ]] || {
  echo "ERROR: Shepard's ATC module not found in $SHEPARD_DIR (set SHEPARD_DIR, and check out fawwaz/task1)" >&2
  exit 1
}
PY="$SHEPARD_DIR/venv/bin/python"
[[ -x "$PY" ]] || PY="$(command -v python3)"
"$PY" -c "import aiohttp" 2>/dev/null || {
  echo "ERROR: aiohttp missing for $PY. Run: $SHEPARD_DIR/venv/bin/pip install -r $SHEPARD_DIR/requirements.txt" >&2
  exit 1
}
[[ -d "$EMU_DIR/node_modules/ws" ]] || {
  echo "ERROR: Emu dependencies missing. Run: npm install --prefix $EMU_DIR" >&2
  exit 1
}

if ! $mock && [[ -z "$sitl" ]]; then
  echo "WARNING: the fake telemetry reports 'armed-automatic' near Aircraft 3 on the test site,"
  echo "         which records startup/uav_in_traffic infractions on the real server."
  read -r -p "Continue? [y/N] " answer
  [[ "$answer" == [yY]* ]] || exit 0
fi

# ---- Run ----
cleanup() {
  trap - INT TERM EXIT
  echo
  echo "Stopping..."
  # Every process in each pipeline is a direct child of this script
  pkill -TERM -P $$ 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

# Prefix every line of a process's output so the two logs can be told apart
label() { sed -u "s/^/[$1] /"; }

export AEAC_CONNECTION_TOKEN="$token"
export PYTHONUNBUFFERED=1  # otherwise Shepard's prints show up late through the pipe

if $mock; then
  (cd "$SHEPARD_DIR" && PYTHONPATH=. exec "$PY" samples/atc_mock_server.py) 2>&1 | label mock &
  sleep 1
fi

shepard_args=()
if $mock; then shepard_args+=(--url "$MOCK_URL"); else shepard_args+=(--competition); fi
[[ -n "$sitl" ]] && shepard_args+=(--sitl "$sitl")
(cd "$SHEPARD_DIR" && PYTHONPATH=. exec "$PY" samples/atc_demo.py "${shepard_args[@]}") 2>&1 | label shepard &

emu_env=(DEBUG=1)
$mock && emu_env+=(ATC_URL="$MOCK_URL")
(cd "$EMU_DIR" && exec env "${emu_env[@]}" node src/server/server.js) 2>&1 \
  | grep --line-buffered -vE '"event": ?"traffic"' | label emu &

if $mock; then echo "Running against the local mock server. Ctrl+C to stop."
else echo "Running against the AEAC server. Ctrl+C to stop."; fi
echo "Emu status: curl localhost:3000/api/atc/status"
wait
