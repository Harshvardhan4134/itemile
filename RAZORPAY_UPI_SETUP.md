# 🔄 Razorpay UPI Payment Setup Guide

## Overview
This guide explains how to enable and configure UPI (Unified Payments Interface) payments in your Razorpay integration.

## ✅ UPI is Now Explicitly Enabled

The code has been updated to explicitly enable UPI payments. UPI should now appear as a payment option in the Razorpay checkout modal.

## 🔧 Step 1: Enable UPI in Razorpay Dashboard

**Important**: UPI must be enabled in your Razorpay account dashboard for it to appear as a payment option.

### Instructions:

1. **Log in to Razorpay Dashboard**
   - Go to: https://dashboard.razorpay.com
   - Sign in with your account

2. **Navigate to Payment Methods**
   - Click on **Settings** (gear icon in top right)
   - Go to **Payment Methods** section
   - Or directly: https://dashboard.razorpay.com/app/payment-methods

3. **Enable UPI**
   - Look for **UPI** in the list of payment methods
   - If it shows "Disabled", click to enable it
   - If UPI is not listed, you may need to request activation
   - **Note**: UPI activation can take up to 10 working days for new accounts

4. **Verify UPI Status**
   - UPI should show as "Enabled" (green checkmark)
   - Make sure your account is in **Live Mode** (not test mode) for UPI to work

## 📱 Step 2: Verify UPI in Your Application

After enabling UPI in the dashboard:

1. **Restart your development server** (if running):
   ```bash
   npm run dev
   ```

2. **Test the Payment Flow**:
   - Navigate to a product page
   - Click "Request to Rent"
   - Fill in booking details
   - Select "Razorpay Payment"
   - Click "Pay"
   - **UPI should now appear** as a payment option in the Razorpay checkout modal

## 🎯 UPI Payment Methods Available

Once enabled, users can pay via:
- ✅ **Google Pay**
- ✅ **PhonePe**
- ✅ **Paytm**
- ✅ **BHIM UPI**
- ✅ **Any UPI-enabled app**

## 🔍 Troubleshooting

### UPI Not Showing in Checkout

**Possible Causes:**

1. **UPI Not Enabled in Dashboard**
   - **Solution**: Enable UPI in Razorpay Dashboard → Settings → Payment Methods

2. **Account in Test Mode**
   - **Solution**: Switch to Live Mode. UPI may not be available in test mode for all accounts

3. **UPI Activation Pending**
   - **Solution**: Wait for activation (can take up to 10 working days). Contact Razorpay support if it's been longer

4. **Browser/Device Issues**
   - **Solution**: 
     - Try a different browser
     - Clear browser cache
     - Try on mobile device (UPI works better on mobile)

5. **Account Restrictions**
   - **Solution**: Check if your Razorpay account has any restrictions. Contact Razorpay support if needed

### Check UPI Status

1. Go to Razorpay Dashboard
2. Navigate to **Settings** → **Payment Methods**
3. Look for UPI status
4. If disabled, click to enable

## 📋 Code Changes Made

The following changes were made to ensure UPI is enabled:

**File**: `src/lib/razorpay.ts`

```typescript
const options: RazorpayOptions = {
  // ... other options
  method: {
    upi: true,        // ✅ UPI explicitly enabled
    card: true,      // ✅ Cards enabled
    netbanking: true, // ✅ Net Banking enabled
    wallet: true,     // ✅ Wallets enabled
  },
  // ... rest of options
};
```

## 🧪 Testing UPI Payments

### Test Mode
- UPI may not be available in test mode
- Use live mode for UPI testing

### Live Mode Testing
1. Use a real UPI ID (e.g., `yourname@paytm`, `yourname@ybl`)
2. Complete a small test transaction (₹1 or minimum amount)
3. Verify payment in Razorpay Dashboard

## 📞 Support

If UPI is still not appearing after following these steps:

1. **Check Razorpay Dashboard** - Verify UPI is enabled
2. **Contact Razorpay Support** - They can help with account-specific issues
3. **Check Razorpay Documentation** - https://razorpay.com/docs/payments/payment-methods/upi/

## ✅ Quick Checklist

- [ ] UPI enabled in Razorpay Dashboard
- [ ] Account is in Live Mode (for production)
- [ ] Code updated with explicit UPI configuration
- [ ] Development server restarted
- [ ] Tested payment flow - UPI appears in checkout
- [ ] Tested UPI payment successfully

## 🎉 Success!

Once UPI is enabled, users will see it as the first payment option in the Razorpay checkout modal, making payments quick and convenient!

