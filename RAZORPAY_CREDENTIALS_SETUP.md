# Razorpay Credentials Setup Guide

This guide explains how to set up Razorpay credentials for both frontend and backend integration.

## 📋 Required Credentials

Razorpay integration requires two types of credentials:

1. **Key ID** - Used on the frontend (safe to expose)
2. **Key Secret** - Used only on the backend (must be kept secret)

## 🔑 Step 1: Get Your Razorpay Credentials

1. **Log in to Razorpay Dashboard**
   - Go to: https://dashboard.razorpay.com
   - Sign in with your account

2. **Navigate to API Keys**
   - Click on **Settings** → **API Keys**
   - Or go directly to: https://dashboard.razorpay.com/app/keys

3. **Generate/Copy Your Keys**
   - **For Testing**: Use Test Keys (starts with `rzp_test_`)
   - **For Production**: Use Live Keys (starts with `rzp_live_`)
   - Copy both:
     - **Key ID** (e.g., `rzp_test_XXXXXXXXXXXXXX`)
     - **Key Secret** (e.g., `XXXXXXXXXXXXXXXXXXXXXXXX`)

⚠️ **Important**: Never share your Key Secret or commit it to version control!

## 🔧 Step 2: Configure Frontend (Key ID)

### Option A: Environment Variable (Recommended)

1. **Open your `.env` file** in the project root
2. **Add your Razorpay Key ID**:

```env
# Razorpay Configuration
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id_here
```

3. **Replace** `rzp_test_your_key_id_here` with your actual Key ID

4. **Restart your development server**:
```bash
npm run dev
```

### Option B: If .env file doesn't exist

Run this command to create it:
```powershell
# Windows PowerShell
@"
# Razorpay Configuration
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id_here
"@ | Out-File -FilePath .env -Encoding utf8
```

Then edit `.env` and replace the placeholder with your actual Key ID.

## 🛡️ Step 3: Configure Backend (Key Secret)

The Key Secret must be stored securely in Firebase Functions (not in `.env` file).

### Method 1: Using Firebase Functions Parameters (Recommended)

1. **Set Razorpay Key ID**:
```bash
firebase functions:config:set razorpay.key_id="rzp_test_your_key_id_here"
```

2. **Set Razorpay Key Secret**:
```bash
firebase functions:config:set razorpay.key_secret="your_key_secret_here"
```

3. **Deploy Functions**:
```bash
firebase deploy --only functions
```

### Method 2: Using Environment Variables (Alternative)

If using the newer `defineString` approach (already implemented in your code):

1. **Set environment variables**:
```bash
firebase functions:config:set razorpay.key_id="rzp_test_your_key_id_here"
firebase functions:config:set razorpay.key_secret="your_key_secret_here"
```

2. **Deploy Functions**:
```bash
firebase deploy --only functions
```

⚠️ **Note**: The current implementation uses `defineString` which reads from Firebase Functions config. Make sure to set both `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in your Firebase Functions configuration.

## ✅ Step 4: Verify Configuration

### Check Frontend Configuration

1. **Check `.env` file** contains `VITE_RAZORPAY_KEY_ID`
2. **Restart dev server** if you just added it
3. **Check browser console** - should not show "Razorpay key not configured" error

### Check Backend Configuration

1. **View Firebase Functions config**:
```bash
firebase functions:config:get
```

2. **You should see**:
```json
{
  "razorpay": {
    "key_id": "rzp_test_...",
    "key_secret": "..."
  }
}
```

3. **Deploy functions** (if not already deployed):
```bash
firebase deploy --only functions:createRazorpayOrder,functions:verifyRazorpayPayment
```

## 🧪 Step 5: Test the Integration

### Test Payment Flow

1. **Start your development server**:
```bash
npm run dev
```

2. **Navigate to a product page** and click "Request to Rent"

3. **Fill in booking details** and proceed to payment

4. **Select "Razorpay Payment"** or "SecurePay"

5. **Click "Pay"** - Razorpay checkout modal should open

6. **Use test credentials**:
   - **Test Card**: `4111 1111 1111 1111`
   - **CVV**: Any 3 digits (e.g., `123`)
   - **Expiry**: Any future date (e.g., `12/25`)

7. **Complete payment** - Should see success message

### Check Function Logs

```bash
firebase functions:log --only createRazorpayOrder
firebase functions:log --only verifyRazorpayPayment
```

## 📝 Configuration Summary

### Frontend (`.env` file)
```env
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id_here
```

### Backend (Firebase Functions Config)
```bash
firebase functions:config:set razorpay.key_id="rzp_test_your_key_id_here"
firebase functions:config:set razorpay.key_secret="your_key_secret_here"
```

## 🔒 Security Best Practices

1. ✅ **Key ID** is safe to expose (can be in `.env` file, visible in frontend code)
2. ✅ **Key Secret** must NEVER be exposed (only in Firebase Functions)
3. ✅ `.env` file is already in `.gitignore` (won't be committed)
4. ✅ Always use **Test Keys** for development
5. ✅ Switch to **Live Keys** only when going to production

## 🚀 Production Checklist

Before going live:

- [ ] Switch to Live Keys (`rzp_live_...`)
- [ ] Update `.env` with live Key ID
- [ ] Update Firebase Functions config with live Key Secret
- [ ] Deploy functions: `firebase deploy --only functions`
- [ ] Test payment with real card (small amount)
- [ ] Verify payment in Razorpay Dashboard
- [ ] Set up webhooks (optional, for payment status updates)
- [ ] Configure refund handling (if needed)

## 🐛 Troubleshooting

### Error: "Razorpay key not configured"

**Solution**: 
- Check `.env` file exists and has `VITE_RAZORPAY_KEY_ID`
- Restart dev server after adding `.env` variable
- Verify the Key ID format (should start with `rzp_test_` or `rzp_live_`)

### Error: "Razorpay credentials not configured" (backend)

**Solution**:
- Check Firebase Functions config: `firebase functions:config:get`
- Set config: `firebase functions:config:set razorpay.key_id="..." razorpay.key_secret="..."`
- Redeploy functions: `firebase deploy --only functions`

### Payment Modal Not Opening

**Solution**:
- Check browser console for errors
- Verify Razorpay script loads (check Network tab)
- Ensure Key ID is correct
- Check if ad blockers are interfering

### Order Creation Fails

**Solution**:
- Check Firebase Functions are deployed
- Verify backend credentials are set correctly
- Check function logs: `firebase functions:log --only createRazorpayOrder`
- The system will fall back to direct payment if order creation fails

## 📚 Additional Resources

- [Razorpay Documentation](https://razorpay.com/docs/)
- [Razorpay Dashboard](https://dashboard.razorpay.com)
- [Test Cards](https://razorpay.com/docs/payments/test-cards/)
- [Razorpay Integration Guide](https://razorpay.com/docs/payments/server-integration/nodejs/payment-gateway/build-integration/)

## 💡 Quick Reference

```bash
# Set Firebase Functions config
firebase functions:config:set razorpay.key_id="rzp_test_..." razorpay.key_secret="..."

# View config
firebase functions:config:get

# Deploy functions
firebase deploy --only functions

# View logs
firebase functions:log --only createRazorpayOrder
```

