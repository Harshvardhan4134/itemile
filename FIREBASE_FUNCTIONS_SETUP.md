# 🔥 Firebase Functions Setup for Email Notifications

## Quick Start

### 1. Initialize Firebase Functions (if not already done)

```bash
firebase init functions
```

Select:
- ✅ JavaScript
- ✅ ESLint
- ✅ Install dependencies

### 2. Install Dependencies

```bash
cd functions
npm install firebase-admin firebase-functions nodemailer
cd ..
```

### 3. Configure Email Credentials

```bash
# Set Gmail credentials
firebase functions:config:set email.user="rentshare11@gmail.com"
firebase functions:config:set email.password="your-gmail-app-password"

# Set your app URL (optional, for email links)
firebase functions:config:set app.url="https://yourapp.com"

# View current config
firebase functions:config:get
```

### 4. Deploy Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:sendEmailNotification
```

---

## 📋 Gmail App Password Setup

Since Google requires App Passwords for programmatic access:

### Step-by-Step:

1. **Enable 2-Factor Authentication** on your Gmail account
   - Go to: https://myaccount.google.com/security
   - Turn on 2-Step Verification

2. **Create App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Select "Other" as the device and name it "Rent Share"
   - Click "Generate"
   - Copy the 16-character password (remove spaces)

3. **Set in Firebase Functions**
   ```bash
   firebase functions:config:set email.password="your16charpassword"
   ```

4. **Redeploy**
   ```bash
   firebase deploy --only functions
   ```

---

## 🧪 Testing Locally

### 1. Download Function Config

```bash
# This creates .runtimeconfig.json locally
firebase functions:config:get > functions/.runtimeconfig.json
```

### 2. Run Emulators

```bash
firebase emulators:start
```

### 3. Trigger Test Email

In your app, create a document in `email_notifications`:

```javascript
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

await addDoc(collection(db, 'email_notifications'), {
  email: 'test@example.com',
  subject: 'Test Email',
  message: 'This is a test email',
  type: 'verification_approved',
  createdAt: serverTimestamp()
});
```

Check the emulator logs to see the email sending process.

---

## 📧 Cloud Functions Included

### 1. `sendEmailNotification`

**Trigger:** New document in `email_notifications` collection

**Purpose:** Sends emails for all notification types

**Example Usage:**
```javascript
await addDoc(collection(db, 'email_notifications'), {
  email: user.email,
  subject: 'Welcome to Rent Share!',
  message: 'Thank you for joining...',
  type: 'verification_approved',
  createdAt: serverTimestamp()
});
```

### 2. `onTransactionCreated`

**Trigger:** New document in `transactions` collection

**Purpose:** Sends email to item owner when rental request is made

**Auto-triggered when:** User clicks "Request to Rent"

### 3. `onNewMessage`

**Trigger:** New document in `chats/{chatId}/messages` collection

**Purpose:** Sends email to recipient when they receive a chat message

**Auto-triggered when:** User sends a chat message

---

## 🔍 Monitoring & Debugging

### View Logs

```bash
# All functions
firebase functions:log

# Specific function
firebase functions:log --only sendEmailNotification

# Real-time logs
firebase functions:log --only sendEmailNotification --lines 50

# Last hour
firebase functions:log --since 1h
```

### Check Function Status

```bash
firebase functions:list
```

### View Execution Details

Go to Firebase Console → Functions → Dashboard

---

## 🐛 Common Issues

### Issue 1: "Invalid login" or "Authentication failed"

**Solution:**
- Make sure 2FA is enabled on Gmail
- Use App Password, not regular password
- Verify config: `firebase functions:config:get`

### Issue 2: Emails not sending

**Check:**
1. Firestore document created in `email_notifications`?
2. Function triggered (check logs)?
3. Gmail credentials correct?
4. Gmail account not blocked?

**Debug:**
```bash
firebase functions:log --only sendEmailNotification --lines 100
```

### Issue 3: Function deployment fails

**Solution:**
```bash
# Clear node_modules and reinstall
cd functions
rm -rf node_modules package-lock.json
npm install
cd ..
firebase deploy --only functions
```

### Issue 4: "Exceeded quota" error

**Solution:**
- Firebase free tier: 125K function invocations/month
- Upgrade to Blaze plan (pay-as-you-go)
- Optimize functions to reduce invocations

---

## 💰 Cost Estimation

### Firebase Functions (Blaze Plan)

**Free Tier (per month):**
- 2M invocations
- 400K GB-seconds
- 200K CPU-seconds
- 5GB network egress

**Typical Usage (1000 users):**
- ~5K function invocations/month
- **Cost: FREE** (well within free tier)

### Scaling Up (10K users):
- ~50K invocations/month
- ~$0-1/month (still within free tier)

**Note:** Gmail has sending limits:
- 500 emails/day (free Gmail)
- 2000 emails/day (Google Workspace)

For higher volume, consider:
- SendGrid (12K free emails/month)
- AWS SES ($0.10 per 1000 emails)
- Mailgun (5K free emails/month)

---

## 🔄 Alternative: SendGrid Integration

If you prefer SendGrid over Gmail:

### Install SendGrid

```bash
cd functions
npm install @sendgrid/mail
```

### Update `functions/index.js`

```javascript
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(functions.config().sendgrid.key);

exports.sendEmailNotification = functions.firestore
  .document("email_notifications/{notificationId}")
  .onCreate(async (snap) => {
    const data = snap.data();
    
    const msg = {
      to: data.email,
      from: 'rentshare11@gmail.com', // Verified sender
      subject: data.subject,
      text: data.message,
      html: `<p>${data.message}</p>`,
    };
    
    try {
      await sgMail.send(msg);
      await snap.ref.update({ sent: true });
    } catch (error) {
      console.error(error);
      await snap.ref.update({ sent: false, error: error.message });
    }
  });
```

### Configure SendGrid

```bash
firebase functions:config:set sendgrid.key="your-sendgrid-api-key"
firebase deploy --only functions
```

---

## 📝 Function Configuration Reference

### Current Config Structure

```json
{
  "email": {
    "user": "rentshare11@gmail.com",
    "password": "your-app-password"
  },
  "app": {
    "url": "https://yourapp.com"
  }
}
```

### Set Config

```bash
# Email credentials
firebase functions:config:set email.user="your@gmail.com"
firebase functions:config:set email.password="your-app-password"

# App URL
firebase functions:config:set app.url="https://yourapp.com"

# Other configs (if needed)
firebase functions:config:set sendgrid.key="your-key"
firebase functions:config:set twilio.sid="your-sid"
```

### Unset Config

```bash
firebase functions:config:unset email.password
```

### Clone Config (Production → Staging)

```bash
firebase functions:config:clone --from production --to staging
```

---

## 🚀 Production Deployment Checklist

- [ ] Gmail App Password configured
- [ ] Firebase Functions config set
- [ ] Functions deployed successfully
- [ ] Test email sent and received
- [ ] Firestore security rules updated
- [ ] Firestore indexes created
- [ ] Function logs reviewed
- [ ] Error handling tested
- [ ] Email templates reviewed
- [ ] Rate limiting considered

---

## 📊 Monitoring Dashboard

### Firebase Console

1. Go to Firebase Console → Functions
2. View:
   - Invocations count
   - Execution time
   - Error rate
   - Memory usage

### Set Up Alerts

1. Go to Firebase Console → Functions → Health
2. Click "Create Alert"
3. Set conditions:
   - Error rate > 5%
   - Execution time > 10s
   - Invocations drop suddenly

---

## 🎯 Best Practices

1. **Error Handling**
   - Always catch errors
   - Log errors to Firestore
   - Return proper HTTP status codes

2. **Performance**
   - Use Promise.all() for parallel operations
   - Minimize database reads
   - Cache frequently accessed data

3. **Security**
   - Never expose credentials in code
   - Use Firebase Functions config
   - Validate all inputs

4. **Testing**
   - Test locally with emulators
   - Test in staging environment
   - Monitor production closely

5. **Scalability**
   - Consider batching for bulk operations
   - Use queues for high-volume scenarios
   - Set appropriate timeout limits

---

## 📞 Need Help?

**Firebase Documentation:**
- https://firebase.google.com/docs/functions

**Nodemailer Documentation:**
- https://nodemailer.com/about/

**Support:**
- rentshare11@gmail.com
- Firebase Community: https://firebase.google.com/community

---

**Last Updated:** October 2025
