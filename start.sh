#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_PYTHON="$DIR/venv/bin/python"
BACKEND_DIR="$DIR/backend"
FRONTEND_DIR="$DIR/frontend"

echo "Starting Arexios Website..."

# Backend
if tmux has-session -t backend 2>/dev/null; then
  echo "  Backend tmux session 'backend' already exists. Skipping."
else
  echo "  Starting backend (port 8001)..."
  tmux new-session -d -s backend "$VENV_PYTHON $BACKEND_DIR/main.py"
  echo "  Backend started in tmux session 'backend'."
fi

# Frontend
if tmux has-session -t frontend 2>/dev/null; then
  echo "  Frontend tmux session 'frontend' already exists. Skipping."
else
  echo "  Starting frontend (port 5174)..."
  tmux new-session -d -s frontend "cd $FRONTEND_DIR && npm run dev"
  echo "  Frontend started in tmux session 'frontend'."
fi

echo "Done. Use './status.sh' to check, './stop.sh' to stop."
