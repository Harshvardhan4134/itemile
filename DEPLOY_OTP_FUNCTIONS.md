# Deploy OTP Email Notification Cloud Functions

## Quick Deployment Guide

### Prerequisites

1. **Firebase CLI installed**
   ```bash
   npm install -g firebase-tools
   ```

2. **Logged into Firebase**
   ```bash
   firebase login
   ```

3. **Firebase project initialized**
   ```bash
   firebase use --add
   # Select your project
   ```

### Step 1: Install Dependencies

```bash
cd functions
npm install
cd ..
```

### Step 2: Configure Email Credentials

Set your Gmail App Password (required for sending emails):

```bash
# Set Gmail credentials
firebase functions:config:set email.user="rentshare11@gmail.com"
firebase functions:config:set email.password="YOUR_GMAIL_APP_PASSWORD"

# Set your app URL (optional, for email links)
firebase functions:config:set app.url="https://lendlly.vercel.app"
```

**⚠️ Important:** You need a Gmail App Password, not your regular password.

#### How to Get Gmail App Password:

1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification** (if not already enabled)
3. Go to https://myaccount.google.com/apppasswords
4. Select:
   - App: **Mail**
   - Device: **Other (Custom name)** → Enter "Lendlly Functions"
5. Click **Generate**
6. Copy the 16-character password (remove spaces)
7. Use it in the command above

### Step 3: Deploy Functions

#### Deploy All Functions:
```bash
firebase deploy --only functions
```

#### Deploy Only OTP Functions:
```bash
firebase deploy --only functions:onPickupOtpGenerated,functions:onReturnOtpGenerated
```

#### Deploy Specific Function:
```bash
firebase deploy --only functions:onPickupOtpGenerated
```

### Step 4: Verify Deployment

1. **Check function status:**
   ```bash
   firebase functions:list
   ```

2. **View logs:**
   ```bash
   firebase functions:log
   ```

3. **Check in Firebase Console:**
   - Go to: https://console.firebase.google.com
   - Navigate to: **Functions** → **Dashboard**
   - You should see:
     - `onPickupOtpGenerated`
     - `onReturnOtpGenerated`
     - `sendEmailNotification`
     - `onTransactionCreated`
     - `onNewMessage`

## Testing the Functions

### Test Pickup OTP Email

1. Create a booking and complete payment
2. The system will automatically:
   - Generate pickup OTP
   - Update transaction status to `pickup_otp_generated`
   - Trigger `onPickupOtpGenerated` function
   - Send emails to renter and owner

3. **Check logs:**
   ```bash
   firebase functions:log --only onPickupOtpGenerated --lines 50
   ```

4. **Verify emails received** in both renter and owner inboxes

### Test Return OTP Email

1. Wait for rental period to end (or manually generate return OTP)
2. The system will automatically:
   - Generate return OTP
   - Update transaction status to `return_otp_generated`
   - Trigger `onReturnOtpGenerated` function
   - Send emails to renter and owner

3. **Check logs:**
   ```bash
   firebase functions:log --only onReturnOtpGenerated --lines 50
   ```

## Monitoring

### View Real-time Logs

```bash
# All functions
firebase functions:log

# Specific function
firebase functions:log --only onPickupOtpGenerated

# Last hour
firebase functions:log --since 1h

# Follow logs (real-time)
firebase functions:log --follow
```

### Check Function Metrics

1. Go to Firebase Console → Functions → Dashboard
2. Click on a function name
3. View:
   - Invocations
   - Execution time
   - Error rate
   - Memory usage

## Troubleshooting

### Issue 1: "Invalid login" or "Authentication failed"

**Solution:**
- Make sure 2FA is enabled on Gmail
- Use App Password, not regular password
- Verify config: `firebase functions:config:get`

**Fix:**
```bash
# Re-set the password
firebase functions:config:set email.password="YOUR_APP_PASSWORD"
firebase deploy --only functions
```

### Issue 2: Functions not triggering

**Check:**
1. Is the transaction status actually changing?
2. Are the functions deployed? `firebase functions:list`
3. Check Firestore rules allow status updates
4. Check function logs for errors

**Debug:**
```bash
firebase functions:log --only onPickupOtpGenerated --lines 100
```

### Issue 3: Emails not sending

**Check:**
1. Gmail credentials correct? `firebase functions:config:get`
2. Function triggered? Check logs
3. Email document created in `email_notifications` collection?
4. Gmail account not blocked or rate-limited?

**Debug:**
```bash
# Check sendEmailNotification function logs
firebase functions:log --only sendEmailNotification --lines 100
```

### Issue 4: Deployment fails

**Solution:**
```bash
# Clear and reinstall dependencies
cd functions
rm -rf node_modules package-lock.json
npm install
cd ..

# Try deploying again
firebase deploy --only functions
```

### Issue 5: "Quota exceeded" error

**Solution:**
- Firebase free tier: 2M function invocations/month
- Upgrade to Blaze plan (pay-as-you-go) if needed
- Check current usage in Firebase Console

## Function Details

### `onPickupOtpGenerated`

**Trigger:** Transaction status changes to `pickup_otp_generated`

**Actions:**
- Sends email to renter with pickup OTP
- Sends email to owner with pickup OTP

**When it runs:**
- Automatically after payment is confirmed
- When `generatePickupOtp()` is called

### `onReturnOtpGenerated`

**Trigger:** Transaction status changes to `return_otp_generated`

**Actions:**
- Sends email to renter with return OTP
- Sends email to owner with return OTP

**When it runs:**
- Automatically 1 day before rental period ends
- When `generateReturnOtp()` is called manually

## Configuration Reference

### Current Config Structure

```json
{
  "email": {
    "user": "rentshare11@gmail.com",
    "password": "your-app-password"
  },
  "app": {
    "url": "https://lendlly.vercel.app"
  }
}
```

### View Current Config

```bash
firebase functions:config:get
```

### Update Config

```bash
# Update email password
firebase functions:config:set email.password="new-password"
firebase deploy --only functions

# Update app URL
firebase functions:config:set app.url="https://new-url.com"
firebase deploy --only functions
```

## Production Checklist

Before deploying to production:

- [ ] Gmail App Password configured
- [ ] Firebase Functions config set
- [ ] All functions deployed successfully
- [ ] Test email sent and received
- [ ] Function logs reviewed (no errors)
- [ ] Firestore security rules updated
- [ ] Error handling tested
- [ ] Email templates reviewed
- [ ] Rate limiting considered (Gmail: 500 emails/day)
- [ ] Monitoring alerts set up

## Cost Estimation

### Firebase Functions (Blaze Plan)

**Free Tier (per month):**
- 2M invocations
- 400K GB-seconds
- 200K CPU-seconds

**Typical Usage:**
- ~100 bookings/month = ~200 function invocations
- **Cost: FREE** (well within free tier)

### Gmail Limits

- **Free Gmail:** 500 emails/day
- **Google Workspace:** 2000 emails/day

For higher volume, consider:
- SendGrid (12K free emails/month)
- AWS SES ($0.10 per 1000 emails)
- Mailgun (5K free emails/month)

## Next Steps

After deployment:

1. **Test the complete flow:**
   - Create a booking
   - Complete payment
   - Verify pickup OTP email received
   - Confirm pickup
   - Wait for return OTP (or generate manually)
   - Verify return OTP email received
   - Confirm return

2. **Monitor logs:**
   ```bash
   firebase functions:log --follow
   ```

3. **Set up alerts** in Firebase Console for:
   - High error rate
   - Function execution failures
   - Quota warnings

## Support

If you encounter issues:

1. Check function logs: `firebase functions:log`
2. Review Firebase Console → Functions → Dashboard
3. Verify Gmail App Password is correct
4. Check Firestore rules allow necessary operations

**Documentation:**
- Firebase Functions: https://firebase.google.com/docs/functions
- Nodemailer: https://nodemailer.com/about/

---

**Last Updated:** January 2025

