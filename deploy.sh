#!/bin/bash

echo "🚀 Prestige Designs Production Deployment Script"
echo "================================================"

# Check if we're on main branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo "❌ Please switch to main branch before deploying"
  exit 1
fi

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Working directory not clean. Please commit all changes."
  exit 1
fi

echo "✅ Git status clean"

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
  echo "❌ .env.production file not found. Please create it first."
  exit 1
fi

echo "✅ Environment file found"

# Run tests if they exist
if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
  echo "🧪 Running tests..."
  npm test
  if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Please fix before deploying."
    exit 1
  fi
  echo "✅ Tests passed"
fi

# Build the project
echo "🏗️  Building project..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed. Please fix build errors."
  exit 1
fi

echo "✅ Build successful"

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
if command -v vercel &> /dev/null; then
  vercel --prod
  echo "✅ Deployment complete!"
else
  echo "❌ Vercel CLI not installed. Install with: npm i -g vercel"
  exit 1
fi

echo ""
echo "🎉 Deployment successful!"
echo "📊 Next steps:"
echo "   1. Test the live site thoroughly"
echo "   2. Monitor error logs"
echo "   3. Check payment processing"
echo "   4. Verify email delivery"
