@echo off
echo 🚀 Prestige Designs Production Deployment Script
echo ================================================

REM Check if we're on main branch
for /f %%i in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%i
if not "%BRANCH%"=="main" (
  echo ❌ Please switch to main branch before deploying
  exit /b 1
)

REM Check if working directory is clean
git status --porcelain > temp.txt
for %%i in (temp.txt) do set size=%%~zi
del temp.txt
if %size% gtr 0 (
  echo ❌ Working directory not clean. Please commit all changes.
  exit /b 1
)

echo ✅ Git status clean

REM Check if .env.production exists
if not exist ".env.production" (
  echo ❌ .env.production file not found. Please create it first.
  exit /b 1
)

echo ✅ Environment file found

REM Build the project
echo 🏗️  Building project...
call npm run build
if errorlevel 1 (
  echo ❌ Build failed. Please fix build errors.
  exit /b 1
)

echo ✅ Build successful

REM Deploy to Vercel
echo 🚀 Deploying to Vercel...
where vercel >nul 2>nul
if errorlevel 1 (
  echo ❌ Vercel CLI not installed. Install with: npm i -g vercel
  exit /b 1
)

call vercel --prod
echo ✅ Deployment complete!

echo.
echo 🎉 Deployment successful!
echo 📊 Next steps:
echo    1. Test the live site thoroughly
echo    2. Monitor error logs  
echo    3. Check payment processing
echo    4. Verify email delivery
