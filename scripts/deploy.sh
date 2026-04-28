#!/bin/bash
# Deploy script — deploy ke VPS Ubuntu 22.04

set -e

echo "==================================="
echo "  Deploying Polymarket Bot"
echo "==================================="

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker jika belum
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

# Install Docker Compose plugin
sudo apt-get install -y docker-compose-plugin

# Setup firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw --force enable

# Buat .env production
if [ ! -f .env ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    cat > .env << EOF
JWT_SECRET=${JWT_SECRET}
EOF
fi

# Build dan deploy
docker compose up -d --build

echo ""
echo "Deploy selesai! Akses di http://$(hostname -I | awk '{print $1}')"
