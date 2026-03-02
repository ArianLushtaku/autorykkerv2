#!/bin/bash

# Start the Flask backend server
echo "Starting Autorykker Backend API..."
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Start the Flask server
echo "Starting Flask server on port 5003..."
python3 app.py
