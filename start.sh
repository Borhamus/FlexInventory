#!/bin/bash

# ─────────────────────────────────────────────
#  start.sh — levanta toda la aplicación
# ─────────────────────────────────────────────

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "📦 [1/3] git pull..."
git pull

echo "🐳 [2/3] docker compose up -d..."
docker compose up -d

echo "🚀 [3/3] Levantando uvicorn y npm en terminales separadas..."

# Detectar emulador de terminal disponible
open_terminal() {
  local title="$1"
  local cmd="$2"

  if command -v gnome-terminal &>/dev/null; then
    gnome-terminal --title="$title" -- bash -c "$cmd; exec bash"
  elif command -v xterm &>/dev/null; then
    xterm -title "$title" -e bash -c "$cmd; exec bash" &
  elif command -v konsole &>/dev/null; then
    konsole --title "$title" -e bash -c "$cmd; exec bash" &
  elif command -v xfce4-terminal &>/dev/null; then
    xfce4-terminal --title="$title" -e "bash -c '$cmd; exec bash'" &
  else
    echo "⚠️  No se encontró un emulador de terminal gráfico."
    echo "    Iniciando $title en background (ver logs en /tmp/${title}.log)"
    bash -c "$cmd" > "/tmp/${title}.log" 2>&1 &
    echo "    PID: $!"
  fi
}

open_terminal "uvicorn" "cd '$PROJECT_DIR' && uvicorn app.main:app --reload"
open_terminal "npm-dev"  "cd '$PROJECT_DIR/frontend' && npm run dev"

echo ""
echo "✅ Todo levantado. Cerrá este script cuando quieras."
