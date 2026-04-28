#!/bin/bash
# SSL setup via Let's Encrypt (certbot)

set -e

if [ -z "$1" ]; then
    echo "Usage: ./ssl.sh <domain>"
    echo "Contoh: ./ssl.sh bot.example.com"
    exit 1
fi

DOMAIN=$1

echo "Setup SSL untuk $DOMAIN..."

# Install certbot
sudo apt-get update
sudo apt-get install -y certbot

# Stop nginx sementara
docker compose stop nginx

# Dapatkan sertifikat
sudo certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Copy sertifikat ke volume
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ./ssl/

echo "SSL sertifikat berhasil didapatkan."
echo "Update nginx.conf untuk menggunakan SSL, lalu jalankan:"
echo "  docker compose up -d --build nginx"
