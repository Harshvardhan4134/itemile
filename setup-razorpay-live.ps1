# Razorpay Live Keys Setup Script
# This script helps you configure your Razorpay live keys

Write-Host "🔑 Razorpay Live Keys Setup" -ForegroundColor Cyan
Write-Host ""

# Get Live Key ID
$keyId = Read-Host "Enter your Razorpay Live Key ID (starts with rzp_live_)"

if (-not $keyId -or -not $keyId.StartsWith("rzp_live_")) {
    Write-Host "❌ Invalid Key ID. It should start with 'rzp_live_'" -ForegroundColor Red
    exit 1
}

# Get Secret Key
$secretKey = Read-Host "Enter your Razorpay Live Secret Key" -AsSecureString
$secretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretKey)
)

Write-Host ""
Write-Host "📝 Setting up frontend configuration..." -ForegroundColor Yellow

# Create or update .env file
$envContent = @"
# Razorpay Configuration (LIVE KEYS)
VITE_RAZORPAY_KEY_ID=$keyId
"@

$envContent | Out-File -FilePath ".env" -Encoding utf8 -Force
Write-Host "✅ Created/Updated .env file with Live Key ID" -ForegroundColor Green

Write-Host ""
Write-Host "🛡️ Setting up backend configuration..." -ForegroundColor Yellow
Write-Host "This will configure Firebase Functions with your Razorpay credentials." -ForegroundColor Gray
Write-Host ""

# Check if Firebase CLI is available
try {
    $firebaseVersion = firebase --version 2>&1
    Write-Host "✅ Firebase CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# Set Firebase Functions config
Write-Host "Setting Razorpay Key ID..." -ForegroundColor Gray
firebase functions:config:set razorpay.key_id="$keyId"

Write-Host "Setting Razorpay Secret Key..." -ForegroundColor Gray
firebase functions:config:set razorpay.key_secret="$secretKeyPlain"

Write-Host ""
Write-Host "✅ Backend configuration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Deploy Firebase Functions:" -ForegroundColor Yellow
Write-Host "   firebase deploy --only functions" -ForegroundColor White
Write-Host ""
Write-Host "2. Restart your development server:" -ForegroundColor Yellow
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "3. Verify configuration:" -ForegroundColor Yellow
Write-Host "   firebase functions:config:get" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Setup complete! Your Razorpay live keys are now configured." -ForegroundColor Green

