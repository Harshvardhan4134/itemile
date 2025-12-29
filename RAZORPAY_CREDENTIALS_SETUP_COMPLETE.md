# 🔑 Razorpay Marketplace Credentials Setup Guide

This guide will walk you through setting up all the credentials needed for the marketplace payment split flow.

## 📋 Credentials You Need

You need **3 types of credentials**:

1. **Frontend: Razorpay Key ID** (for checkout)
2. **Backend: Razorpay Key ID + Key Secret** (for order creation, transfers, refunds)
3. **Backend: Platform Account ID** (your main Razorpay account ID for Route)

---

## 🔧 Step-by-Step Setup

### Step 1: Get Your Razorpay API Keys

1. **Log in to Razorpay Dashboard**
   - Go to: https://dashboard.razorpay.com
   - Sign in with your account

2. **Navigate to API Keys**
   - Click on **Settings** (gear icon in top right)
   - Go to **API Keys** section
   - Or directly: https://dashboard.razorpay.com/app/keys

3. **Copy Your Keys**
   - **Key ID**: Copy the Key ID (starts with `rzp_test_` for test mode or `rzp_live_` for production)
   - **Key Secret**: Click "Reveal" and copy the Key Secret (longer string, keep it secret!)
   
   ⚠️ **Important**: 
   - For **development/testing**: Use **Test Keys** (starts with `rzp_test_`)
   - For **production**: Use **Live Keys** (starts with `rzp_live_`)
   - **Never share your Key Secret** - it's only for backend use

---

### Step 2: Configure Frontend (Key ID)

1. **Open or create `.env` file** in your project root directory

2. **Add your Razorpay Key ID**:

```env
# Razorpay Configuration
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id_here
```

3. **Replace** `rzp_test_your_key_id_here` with your actual Key ID from Step 1

4. **Example**:
```env
VITE_RAZORPAY_KEY_ID=rzp_test_1234567890ABCDEF
```

5. **Restart your development server**:
```bash
npm run dev
```

---

### Step 3: Configure Backend (Key ID + Key Secret)

#### Option A: Using Firebase CLI (Recommended)

1. **Open terminal/PowerShell** in your project directory

2. **Set Razorpay Key ID**:
```bash
firebase functions:config:set razorpay.key_id="rzp_test_your_key_id_here"
```

3. **Set Razorpay Key Secret**:
```bash
firebase functions:config:set razorpay.key_secret="your_key_secret_here"
```

4. **Verify the configuration**:
```bash
firebase functions:config:get
```

You should see:
```json
{
  "razorpay": {
    "key_id": "rzp_test_...",
    "key_secret": "..."
  }
}
```

5. **Deploy the functions**:
```bash
firebase deploy --only functions
```

#### Option B: If you get errors, try setting both at once:

```bash
firebase functions:config:set razorpay.key_id="rzp_test_your_key_id" razorpay.key_secret="your_key_secret"
firebase deploy --only functions
```

---

### Step 4: Get Your Platform Account ID (for Route)

1. **Enable Razorpay Route** (if not already enabled)
   - Go to: https://dashboard.razorpay.com/app/route
   - Click **Enable Route** if not already enabled
   - Follow the setup wizard if needed

2. **Get Your Platform Account ID**
   - Your Platform Account ID is your main Razorpay account ID
   - Format: `acc_XXXXXXXXXXXXXX`
   - You can find it in:
     - Route Dashboard → Accounts (your main account will be listed)
     - Or in Settings → Account Details

3. **Set Platform Account ID**:
```bash
firebase functions:config:set razorpay.platform_account_id="acc_your_platform_account_id"
firebase deploy --only functions
```

**Example**:
```bash
firebase functions:config:set razorpay.platform_account_id="acc_7s8d9sdsd93"
firebase deploy --only functions
```

---

### Step 5: Verify All Configuration

Run this command to see all your Razorpay settings:

```bash
firebase functions:config:get
```

You should see:
```json
{
  "razorpay": {
    "key_id": "rzp_test_...",
    "key_secret": "...",
    "platform_account_id": "acc_..."
  }
}
```

---

## 📝 Complete Configuration Checklist

### Frontend (`.env` file)
- [ ] `VITE_RAZORPAY_KEY_ID` is set
- [ ] Key ID starts with `rzp_test_` (test) or `rzp_live_` (production)
- [ ] Dev server restarted after adding `.env` variable

### Backend (Firebase Functions Config)
- [ ] `razorpay.key_id` is set
- [ ] `razorpay.key_secret` is set
- [ ] `razorpay.platform_account_id` is set
- [ ] Functions deployed after setting config

### Razorpay Dashboard
- [ ] Route is enabled
- [ ] Platform account ID is noted
- [ ] Test keys are available (or live keys for production)

---

## 🧪 Testing Your Setup

### 1. Test Frontend Configuration

1. Start your dev server:
```bash
npm run dev
```

2. Open browser console and check:
   - No "Razorpay key not configured" errors
   - Razorpay checkout modal opens when you try to pay

### 2. Test Backend Configuration

1. Check function logs:
```bash
firebase functions:log --only createRazorpayOrder
```

2. Try creating a test payment:
   - Should not see "Razorpay credentials not configured" errors
   - Order creation should work

### 3. Test Route Account Creation

1. Call the Route account creation function (via your app or test script)
2. Check if account is created successfully
3. Verify account ID is stored in user document

---

## 🚨 Troubleshooting

### Error: "Razorpay key not configured" (Frontend)

**Solution**:
- Check `.env` file exists and has `VITE_RAZORPAY_KEY_ID`
- Make sure you restarted dev server after adding `.env`
- Verify Key ID format (should start with `rzp_test_` or `rzp_live_`)

### Error: "Razorpay credentials not configured" (Backend)

**Solution**:
1. Check config is set: `firebase functions:config:get`
2. If missing, set it: `firebase functions:config:set razorpay.key_id="..." razorpay.key_secret="..."`
3. Redeploy: `firebase deploy --only functions`

### Error: "Platform account ID not configured"

**Solution**:
1. Enable Route in Razorpay Dashboard
2. Get your Platform Account ID
3. Set it: `firebase functions:config:set razorpay.platform_account_id="acc_..."`
4. Redeploy functions

### Payment Modal Not Opening

**Check**:
1. `.env` file has correct Key ID
2. Dev server restarted
3. Browser console for errors
4. Ad blockers might be interfering

### Order Creation Fails

**Check**:
1. Backend credentials are set correctly
2. Functions are deployed
3. Check function logs: `firebase functions:log --only createRazorpayOrder`
4. Verify Key Secret is correct (no typos)

---

## 🔐 Security Best Practices

1. ✅ **Key ID** is safe to expose (can be in `.env`, visible in frontend code)
2. ✅ **Key Secret** must NEVER be exposed:
   - Only in Firebase Functions config (backend only)
   - Never commit to git
   - Never log or display in frontend
3. ✅ `.env` file is in `.gitignore` (won't be committed)
4. ✅ Use **Test Keys** for development
5. ✅ Switch to **Live Keys** only when going to production

---

## 🔄 Production Checklist

Before going live:

- [ ] Switch to **Live Keys** (`rzp_live_...`)
- [ ] Update `.env` with live Key ID
- [ ] Update Firebase Functions config with live Key Secret
- [ ] Verify Platform Account ID (should be same, but double-check)
- [ ] Deploy functions: `firebase deploy --only functions`
- [ ] Test payment with real card (small amount)
- [ ] Verify payment in Razorpay Dashboard
- [ ] Check Route is enabled for production
- [ ] Test deposit refund flow

---

## 📚 Quick Reference

### Set All Config at Once

```bash
firebase functions:config:set \
  razorpay.key_id="rzp_test_your_key_id" \
  razorpay.key_secret="your_key_secret" \
  razorpay.platform_account_id="acc_your_platform_id"

firebase deploy --only functions
```

### View Current Config

```bash
firebase functions:config:get
```

### Update Single Value

```bash
firebase functions:config:set razorpay.key_id="rzp_test_new_key_id"
firebase deploy --only functions
```

---

## 🎯 Summary

**What you need:**
1. Key ID (from Razorpay Dashboard)
2. Key Secret (from Razorpay Dashboard)
3. Platform Account ID (your main Razorpay account ID)

**Where to set them:**
1. Key ID → `.env` file (frontend)
2. Key ID + Key Secret + Platform Account ID → Firebase Functions config (backend)

**How to set them:**
1. Frontend: Add to `.env` file, restart dev server
2. Backend: Use `firebase functions:config:set` commands, deploy functions

That's it! Once configured, your marketplace payment split will work automatically! 🎉

