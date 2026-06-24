#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Restarting Arexios Website..."
"$DIR/stop.sh"
sleep 1
"$DIR/start.sh"
echo "Restart complete."
