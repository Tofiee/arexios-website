#!/usr/bin/env bash
set -e

echo "Stopping Arexios Website..."

# Backend
if tmux has-session -t backend 2>/dev/null; then
  echo "  Stopping backend..."
  tmux send-keys -t backend C-c
  sleep 1
  tmux kill-session -t backend 2>/dev/null || true
  echo "  Backend stopped."
else
  echo "  Backend not running."
fi

# Frontend
if tmux has-session -t frontend 2>/dev/null; then
  echo "  Stopping frontend..."
  tmux send-keys -t frontend C-c
  sleep 1
  tmux kill-session -t frontend 2>/dev/null || true
  echo "  Frontend stopped."
else
  echo "  Frontend not running."
fi

# Kill orphan processes just in case
pkill -f "$VENV_PYTHON.*main.py" 2>/dev/null || true
pkill -f "node.*vite" 2>/dev/null || true

echo "Done."
