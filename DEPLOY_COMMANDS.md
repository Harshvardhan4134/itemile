# Quick Deployment Commands

## Prerequisites
1. Make sure you're logged in: `firebase login`
2. If not logged in, run: `firebase login` first

## Quick Deploy (Copy & Paste All at Once)

```bash
firebase use rentshare-5c5eb && firebase functions:config:set email.user="lendlly2025@gmail.com" email.password="alvuaukypqrvltsh" app.url="https://lendlly.vercel.app" && firebase deploy --only functions
```

## Step-by-Step (Recommended)

### 1. Set Project
```bash
firebase use rentshare-5c5eb
```

### 2. Configure Email
```bash
firebase functions:config:set email.user="lendlly2025@gmail.com" email.password="alvuaukypqrvltsh" app.url="https://lendlly.vercel.app"
```

### 3. Verify Config
```bash
firebase functions:config:get
```

### 4. Deploy
```bash
firebase deploy --only functions
```

## What Gets Deployed

- ✅ `sendEmailNotification` - General email sending
- ✅ `onTransactionCreated` - Booking confirmation emails
- ✅ `onNewMessage` - Chat message emails
- ✅ `onPickupOtpGenerated` - Pickup OTP emails (NEW)
- ✅ `onReturnOtpGenerated` - Return OTP emails (NEW)

## After Deployment

Test by creating a booking - the pickup OTP email should be sent automatically!

## Troubleshooting

If you get "Failed to authenticate":
```bash
firebase login
```

If deployment fails:
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

