#!/bin/bash
set -euo pipefail

APP_DIR="/var/www/task-manager/aischeduler"

export NVM_DIR="${HOME}/.nvm"
if [ -s "${NVM_DIR}/nvm.sh" ]; then
  . "${NVM_DIR}/nvm.sh"
fi

cd "${APP_DIR}"

echo "[deploy] Installing backend dependencies"
cd backend
npm install

echo "[deploy] Installing MCP server dependencies"
cd ../mcp-server
npm install

echo "[deploy] Restarting PM2 processes"
cd ..
pm2 restart task-manager-backend
pm2 restart task-manager-mcp
pm2 save

echo "[deploy] Deployment complete"
