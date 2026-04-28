#!/bin/bash
# Setup script — install dan jalankan Polymarket Smart Sniper Bot

set -e

echo "==================================="
echo "  Polymarket Smart Sniper Bot"
echo "  Setup & Installation"
echo "==================================="

# Cek Docker
if ! command -v docker &> /dev/null; then
    echo "Docker belum terinstall. Menginstall..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "Docker terinstall. Silakan logout dan login kembali."
fi

# Cek Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Docker Compose belum terinstall."
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin
fi

# Buat .env jika belum ada
if [ ! -f .env ]; then
    echo "Membuat file .env..."
    JWT_SECRET=$(openssl rand -hex 32)
    cat > .env << EOF
JWT_SECRET=${JWT_SECRET}
EOF
    echo ".env dibuat dengan JWT secret random."
fi

# Build dan jalankan
echo ""
echo "Membangun dan menjalankan container..."
docker compose up -d --build

echo ""
echo "==================================="
echo "  Setup selesai!"
echo ""
echo "  Frontend : http://localhost:80"
echo "  Backend  : http://localhost:8000"
echo "  API Docs : http://localhost:8000/docs"
echo ""
echo "  Default mode: TESTNET"
echo "==================================="
