#!/bin/bash
# Railway start script for production build

echo "🔨 Building frontend for production..."
npm run build

echo "🚀 Starting Express server..."
node server.js