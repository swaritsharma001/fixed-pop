#!/usr/bin/env bash
# ==============================================================================
# PopPay Automated EC2 Ubuntu Setup & Deployment Script
# ==============================================================================
set -e

echo ">>> [1/5] Updating system packages and installing prerequisites..."
sudo apt-get update -y
sudo apt-get install -y curl git nginx ufw build-essential

echo ">>> [2/5] Installing Node.js 20 LTS and PM2..."
if ! command -v node > /dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
sudo npm install -g pm2

echo ">>> [3/5] Installing project dependencies..."
npm install
cd client && npm install && cd ..
cd examples/merchant-node && npm install && cd ../..

echo ">>> [4/5] Building frontend production assets..."
npm run build

echo ">>> [5/5] Configuring PM2 to start PopPay backend..."
pm2 start ecosystem.config.js --env production
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME || true

echo "=============================================================================="
echo " PopPay successfully deployed and running on PM2!"
echo " Check status with: pm2 status"
echo " View live logs with: pm2 logs"
echo " Universal Admin Login: admin@maheshsharma.com"
echo "=============================================================================="
