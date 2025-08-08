#!/bin/bash

# PayFlow Vercel Environment Variables Setup Script
# This script sets up all required environment variables for Vercel deployment

set -e  # Exit on any error

echo "🚀 PayFlow Vercel Environment Setup"
echo "===================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if .env.vercel exists
if [ ! -f ".env.vercel" ]; then
    echo "❌ .env.vercel file not found. Please create and configure it first."
    echo "Copy from .env.vercel template and update with your values."
    exit 1
fi

echo "📋 Reading environment variables from .env.vercel..."

# Source the environment file
set -a  # automatically export all variables
source .env.vercel
set +a

echo "🔗 Linking to Vercel project..."
vercel link

echo "🔧 Setting up environment variables..."

# Critical Variables
echo "Setting DATABASE_URL..."
vercel env add DATABASE_URL "$DATABASE_URL" production

echo "Setting NEXTAUTH_SECRET..."
vercel env add NEXTAUTH_SECRET "$NEXTAUTH_SECRET" production

echo "Setting NEXTAUTH_URL..."
vercel env add NEXTAUTH_URL "$NEXTAUTH_URL" production

# Google OAuth
if [ -n "$GOOGLE_CLIENT_ID" ]; then
    echo "Setting GOOGLE_CLIENT_ID..."
    vercel env add GOOGLE_CLIENT_ID "$GOOGLE_CLIENT_ID" production
fi

if [ -n "$GOOGLE_CLIENT_SECRET" ]; then
    echo "Setting GOOGLE_CLIENT_SECRET..."
    vercel env add GOOGLE_CLIENT_SECRET "$GOOGLE_CLIENT_SECRET" production
fi

# Email Configuration
if [ -n "$EMAIL_SERVER_HOST" ]; then
    echo "Setting EMAIL_SERVER_HOST..."
    vercel env add EMAIL_SERVER_HOST "$EMAIL_SERVER_HOST" production
fi

if [ -n "$EMAIL_SERVER_PORT" ]; then
    echo "Setting EMAIL_SERVER_PORT..."
    vercel env add EMAIL_SERVER_PORT "$EMAIL_SERVER_PORT" production
fi

if [ -n "$EMAIL_SERVER_USER" ]; then
    echo "Setting EMAIL_SERVER_USER..."
    vercel env add EMAIL_SERVER_USER "$EMAIL_SERVER_USER" production
fi

if [ -n "$EMAIL_SERVER_PASSWORD" ]; then
    echo "Setting EMAIL_SERVER_PASSWORD..."
    vercel env add EMAIL_SERVER_PASSWORD "$EMAIL_SERVER_PASSWORD" production
fi

if [ -n "$EMAIL_FROM" ]; then
    echo "Setting EMAIL_FROM..."
    vercel env add EMAIL_FROM "$EMAIL_FROM" production
fi

# Optional Upload Variables
if [ -n "$UPLOADTHING_SECRET" ]; then
    echo "Setting UPLOADTHING_SECRET..."
    vercel env add UPLOADTHING_SECRET "$UPLOADTHING_SECRET" production
fi

if [ -n "$UPLOADTHING_APP_ID" ]; then
    echo "Setting UPLOADTHING_APP_ID..."
    vercel env add UPLOADTHING_APP_ID "$UPLOADTHING_APP_ID" production
fi

echo ""
echo "✅ All environment variables have been set!"
echo "🔍 You can verify them with: vercel env ls"
echo "🚀 Deploy your app with: vercel --prod"
echo ""
echo "📋 Next Steps:"
echo "1. Set up Vercel Postgres database if you haven't already"
echo "2. Update DATABASE_URL with your Vercel Postgres URL"
echo "3. Configure Google OAuth app with your production domain"
echo "4. Test your deployment!"

# Optional: Trigger a deployment
read -p "Would you like to deploy now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Deploying to production..."
    vercel --prod
fi