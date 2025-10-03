#!/bin/bash
# Railway start script for production build

echo "🔨 Building frontend for production..."
npm run build

echo "🚀 Starting production server..."
npx vite preview --host 0.0.0.0 --port $PORT