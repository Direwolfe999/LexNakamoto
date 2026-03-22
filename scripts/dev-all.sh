#!/bin/bash
# ==============================================================================
# Feature 12: Competition-Ready Developer Experience Script
# Unifies Next.js UI, TSX Node Indexer, and File Watching to make 
# project evaluation completely frictionless.
# ==============================================================================

echo "[dev:all] Starting full B2B Protocol Environment (Nakamoto + sBTC)"

# Start styling output colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}[dev:all] Initiating Backend Indexer on http://localhost:3001${NC}"
npm --prefix backend run dev &
BACKEND_PID=$!

sleep 2 # Let backend spool up

echo -e "${BLUE}[dev:all] Initiating Next.js UI on http://localhost:3000${NC}"
npm --prefix frontend run dev &
FRONTEND_PID=$!

echo "[dev:all] Environment running. Press Ctrl+C to stop both."

# Trap sigint to kill both processes
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT

wait
