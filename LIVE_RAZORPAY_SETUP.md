# 🔑 Live Razorpay Keys Setup - Quick Guide

## ✅ You Have:
- ✅ Live Key ID (starts with `rzp_live_`)
- ✅ Live Secret Key

## 📝 Step 1: Configure Frontend (Key ID)

1. **Create `.env` file** in the project root (if it doesn't exist)
2. **Add your Live Key ID**:

```env
# Razorpay Configuration (LIVE KEYS)
VITE_RAZORPAY_KEY_ID=rzp_live_YOUR_KEY_ID_HERE
```

Replace `rzp_live_YOUR_KEY_ID_HERE` with your actual Live Key ID.

3. **Restart your development server** after adding the key:
```bash
npm run dev
```

## 🛡️ Step 2: Configure Backend (Key ID + Secret)

Run these commands in your terminal (PowerShell or Command Prompt):

```bash
# Set Razorpay Live Key ID
firebase functions:config:set razorpay.key_id="rzp_live_YOUR_KEY_ID_HERE"

# Set Razorpay Live Secret Key
firebase functions:config:set razorpay.key_secret="YOUR_SECRET_KEY_HERE"

# Deploy the functions to apply changes
firebase deploy --only functions
```

**Important**: Replace the placeholders with your actual keys!

## ✅ Step 3: Verify Configuration

### Check Frontend:
1. Open `.env` file - should contain `VITE_RAZORPAY_KEY_ID=rzp_live_...`
2. Restart dev server if you just added it

### Check Backend:
```bash
# View current Firebase Functions config
firebase functions:config:get
```

You should see:
```json
{
  "razorpay": {
    "key_id": "rzp_live_...",
    "key_secret": "..."
  }
}
```

## 🚨 Important Security Notes

1. ✅ **Key ID** is safe to expose (can be in `.env` file, visible in frontend)
2. ✅ **Secret Key** must NEVER be exposed (only in Firebase Functions)
3. ✅ `.env` file is already in `.gitignore` (won't be committed)
4. ⚠️ **Never commit your Secret Key** to version control
5. ⚠️ **Never share your Secret Key** publicly

## 🧪 Testing

After setup, test a payment:
1. Navigate to a product page
2. Click "Request to Rent"
3. Fill booking details
4. Select "Razorpay Payment"
5. Complete payment with a real card (small amount for testing)

## 📋 Quick Command Reference

```bash
# Set both keys at once
firebase functions:config:set razorpay.key_id="rzp_live_..." razorpay.key_secret="..."

# View config
firebase functions:config:get

# Deploy functions
firebase deploy --only functions

# View function logs
firebase functions:log
```

## 🐛 Troubleshooting

### Error: "Razorpay key not configured"
- Check `.env` file exists and has `VITE_RAZORPAY_KEY_ID`
- Restart dev server after adding `.env` variable
- Verify Key ID format (should start with `rzp_live_`)

### Error: "Razorpay credentials not configured" (backend)
- Check Firebase Functions config: `firebase functions:config:get`
- Make sure you deployed functions after setting config
- Verify both `key_id` and `key_secret` are set

### Payment not working
- Verify you're using **Live Keys** (not test keys)
- Check Razorpay Dashboard for payment status
- Review function logs: `firebase functions:log`

