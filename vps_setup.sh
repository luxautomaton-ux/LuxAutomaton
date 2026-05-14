#!/bin/bash
# Lux Automaton — Fast VPS Hybrid Setup
# Use this script on any cheap VPS (Oracle Free Tier, AWS, etc) to host your AI models
# while keeping your data local on your main machine.

echo "🚀 Initializing Lux Hybrid VPS Setup..."

# 1. Update and install dependencies
sudo apt update && sudo apt install -y curl git ufw

# 2. Install Ollama (The backend engine)
if ! command -v ollama &> /dev/null; then
    echo "📦 Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
fi

# 3. Secure the server (Only allow SSH and Lux Tunnel)
sudo ufw allow 22/tcp
sudo ufw allow 11434/tcp
sudo ufw enable

# 4. Instructions for Hybrid Connection
IP=$(curl -s ifconfig.me)
echo "-------------------------------------------------------"
echo "✅ VPS IS READY!"
echo "Your IP: $IP"
echo ""
echo "Step 1: On your LOCAL machine, run this to tunnel to the VPS:"
echo "ssh -L 11434:localhost:11434 user@$IP"
echo ""
echo "Step 2: Your app will now use the VPS hardware but save everything locally."
echo "-------------------------------------------------------"
