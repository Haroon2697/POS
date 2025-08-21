#!/bin/bash

echo "========================================"
echo "   Supermarket POS System Installer"
echo "========================================"
echo

echo "Installing dependencies..."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 16+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "Error: Node.js 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "Node.js version: $(node -v)"
echo

# Install root dependencies
echo "[1/3] Installing root dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "Error: Failed to install root dependencies"
    exit 1
fi

# Install server dependencies
echo "[2/3] Installing server dependencies..."
cd server
npm install
if [ $? -ne 0 ]; then
    echo "Error: Failed to install server dependencies"
    exit 1
fi
cd ..

# Install client dependencies
echo "[3/3] Installing client dependencies..."
cd client
npm install
if [ $? -ne 0 ]; then
    echo "Error: Failed to install client dependencies"
    exit 1
fi
cd ..

echo
echo "========================================"
echo "    Installation Complete!"
echo "========================================"
echo
echo "To start the system:"
echo "  1. Run: npm run dev"
echo "  2. Open: http://localhost:3000"
echo
echo "Default credentials:"
echo "  Admin: admin / admin"
echo "  Cashier: cashier / cashier"
echo
echo "Remember to change default passwords!"
echo
echo "Press Enter to continue..."
read
