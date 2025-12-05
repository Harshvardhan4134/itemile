@echo off
echo ========================================
echo Firebase Functions Deployment Script
echo ========================================
echo.

echo Step 1: Setting Firebase project...
firebase use rentshare-5c5eb
if %errorlevel% neq 0 (
    echo ERROR: Failed to set project. Make sure you're logged in with: firebase login
    pause
    exit /b 1
)

echo.
echo Step 2: Configuring email credentials...
firebase functions:config:set email.user="lendlly2025@gmail.com" email.password="alvuaukypqrvltsh" app.url="https://lendlly.vercel.app"
if %errorlevel% neq 0 (
    echo ERROR: Failed to set configuration
    pause
    exit /b 1
)

echo.
echo Step 3: Verifying configuration...
firebase functions:config:get

echo.
echo Step 4: Deploying functions...
echo This may take a few minutes...
firebase deploy --only functions
if %errorlevel% neq 0 (
    echo ERROR: Deployment failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
pause

