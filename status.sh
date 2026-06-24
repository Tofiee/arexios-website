#!/usr/bin/env bash

echo "=== Arexios Website Status ==="
echo ""

# Backend — check by port first, then tmux
if ss -tlnp 2>/dev/null | grep -q ":8001 "; then
  if tmux has-session -t backend 2>/dev/null; then
    echo "  Backend  : RUNNING  (tmux: backend, port: 8001)"
  else
    echo "  Backend  : RUNNING  (no tmux, port: 8001)"
  fi
else
  if tmux has-session -t backend 2>/dev/null; then
    echo "  Backend  : TMUX-OK but process down (port: 8001)"
  else
    echo "  Backend  : STOPPED"
  fi
fi

# Frontend — check by port first, then tmux
if ss -tlnp 2>/dev/null | grep -q ":5174 "; then
  if tmux has-session -t frontend 2>/dev/null; then
    echo "  Frontend : RUNNING  (tmux: frontend, port: 5174)"
  else
    echo "  Frontend : RUNNING  (no tmux, port: 5174)"
  fi
else
  if tmux has-session -t frontend 2>/dev/null; then
    echo "  Frontend : TMUX-OK but process down (port: 5174)"
  else
    echo "  Frontend : STOPPED"
  fi
fi

echo ""
echo "Active tmux sessions:"
tmux list-sessions 2>/dev/null | grep -E "backend|frontend" || echo "  (none)"
echo ""
echo "Active ports (arexios):"
ss -tlnp 2>/dev/null | grep -E "8001|5174" || echo "  (none)"
echo ""
echo "API test:"
curl -s http://127.0.0.1:8001/ 2>/dev/null || echo "  Backend API not reachable"
