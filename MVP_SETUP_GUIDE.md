# 🚀 MVP Setup Guide: Manual KYC + Email Notifications

This guide will help you deploy the complete MVP with Manual KYC Verification and Email Notifications.

---

## ✅ Features Implemented

### 1. **Manual KYC Verification System**
- User document upload (Aadhaar front/back, PAN, Selfie)
- Admin panel for verification review
- Approval/Rejection workflow
- In-app notifications
- Email notifications for verification status

### 2. **Email Notification System**
- Verification approved/rejected emails
- New rental request notifications
- Chat message notifications
- Firebase Cloud Functions integration
- Automated email sending via Nodemailer

---

## 📋 Prerequisites

Before you begin, ensure you have:
- Node.js (v18 or later)
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project
- Gmail account (for sending emails)
- Cloudinary account (for image uploads)

---

## 🔧 Setup Instructions

### Step 1: Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install Firebase Functions dependencies
cd functions
npm install
cd ..
```

### Step 2: Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

### Step 3: Set Up Gmail App Password

1. Go to https://myaccount.google.com/apppasswords
2. Sign in to your Gmail account
3. Create a new App Password for "Mail"
4. Copy the 16-character password

### Step 4: Configure Firebase Functions

```bash
# Login to Firebase
firebase login

# Set your Firebase project
firebase use your-project-id

# Configure email credentials
firebase functions:config:set email.user="rentshare11@gmail.com"
firebase functions:config:set email.password="your-16-char-app-password"

# Optional: Set app URL for email links
firebase functions:config:set app.url="https://yourapp.com"
```

### Step 5: Update Firestore Security Rules

Add these rules to your Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // Allow admins to update verification status
      allow update: if request.auth != null && 
        request.auth.token.email in ['rentshare11@gmail.com', 'admin@rentshare.com'];
    }
    
    // Email notifications (write-only by users, read by Cloud Functions)
    match /email_notifications/{notificationId} {
      allow create: if request.auth != null;
      allow read, update: if false; // Only Cloud Functions can read/update
    }
    
    // Regular notifications
    match /notifications/{notificationId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
      allow update: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // Listings, transactions, chats (existing rules)
    match /listings/{listingId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && resource.data.ownerId == request.auth.uid;
    }
    
    match /transactions/{transactionId} {
      allow read: if request.auth != null && 
        (resource.data.ownerId == request.auth.uid || 
         resource.data.renterId == request.auth.uid);
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        (resource.data.ownerId == request.auth.uid || 
         resource.data.renterId == request.auth.uid);
    }
    
    match /chats/{chatId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.participants;
        
      match /messages/{messageId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

### Step 6: Create Firestore Indexes

Add these indexes in Firebase Console → Firestore → Indexes:

```
Collection: users
- verificationStatus (Ascending)
- submittedAt (Descending)

Collection: email_notifications  
- createdAt (Ascending)

Collection: notifications
- userId (Ascending)
- createdAt (Descending)
- read (Ascending)
```

### Step 7: Deploy Firebase Functions

```bash
# Deploy Cloud Functions
firebase deploy --only functions

# Or deploy everything (functions + hosting)
firebase deploy
```

### Step 8: Build and Run Locally

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🧑‍💼 Admin Access

### Setting Up Admin Users

Only whitelisted emails can access the admin panel at `/admin/verify-users`.

**Default admin emails:**
- `rentshare11@gmail.com`
- `admin@rentshare.com`

To add more admins, update `src/pages/AdminKYC.tsx`:

```typescript
const ADMIN_EMAILS = [
  'rentshare11@gmail.com', 
  'admin@rentshare.com',
  'your-admin@example.com' // Add more here
];
```

### Admin Panel Features

- View all pending KYC verifications
- Click "View Docs" to see uploaded documents
- Approve or reject verifications
- Provide rejection reason (sent to user via email)
- Real-time updates

---

## 📧 Email Templates

Emails are sent for these events:

### 1. Verification Approved
- **Subject:** Verification Approved ✅ - Rent Share
- **Trigger:** Admin approves KYC
- **Recipient:** User

### 2. Verification Rejected
- **Subject:** Verification Failed - Action Required - Rent Share
- **Trigger:** Admin rejects KYC
- **Recipient:** User
- **Includes:** Rejection reason

### 3. New Rental Request
- **Subject:** New Rental Request! 🎉 - Rent Share
- **Trigger:** User requests to rent an item
- **Recipient:** Item owner

### 4. New Chat Message
- **Subject:** New message from [Name] - Rent Share
- **Trigger:** User sends a chat message
- **Recipient:** Other chat participant

### Customizing Email Templates

Edit `functions/index.js` to customize:
- Email content
- HTML styling
- Subject lines
- Sender information

---

## 🔄 User Flow: KYC Verification

### For Users:

1. **Submit Documents**
   - Go to Profile → Verification tab
   - Upload Aadhaar (front/back), PAN, Selfie (optional)
   - Click "Submit for Verification"
   - See "Verification Pending" banner

2. **Wait for Approval**
   - Yellow banner: "Your verification is pending..."
   - Receive email notification when processed

3. **Approved**
   - Green banner: "Verified Account"
   - Full platform access
   - In-app + email notification

4. **Rejected**
   - Red banner with rejection reason
   - Button to "Upload Again"
   - In-app + email notification

### For Admins:

1. **Access Admin Panel**
   - Go to `/admin/verify-users`
   - Only whitelisted emails can access

2. **Review Submissions**
   - View list of pending verifications
   - Click "View Docs" to see documents

3. **Approve or Reject**
   - Click ✅ "Approve" → User verified
   - Click ❌ "Reject" → Provide reason
   - User receives email notification

---

## 🧪 Testing

### Test KYC Verification:

1. Create a test user account
2. Upload sample documents (any images for testing)
3. Check Firestore: `users/{uid}` should have:
   - `verificationStatus: "pending"`
   - URLs for uploaded documents

4. Login as admin: `rentshare11@gmail.com`
5. Go to `/admin/verify-users`
6. Approve or reject the verification
7. Check user's email for notification

### Test Email Notifications:

1. **Local Testing (Firebase Emulator):**
   ```bash
   firebase emulators:start
   ```
   Emails won't actually send, but you'll see logs

2. **Production Testing:**
   - Deploy functions
   - Trigger an event (rental request, verification)
   - Check Firestore `email_notifications` collection
   - Check recipient's email inbox

### Debugging:

```bash
# View Firebase Functions logs
firebase functions:log

# View real-time logs
firebase functions:log --only sendEmailNotification
```

---

## 📱 Frontend Components

### New Components:

1. **`src/components/KYCVerification.tsx`**
   - Document upload form
   - Status display (pending/approved/rejected)
   - Cloudinary integration

2. **`src/components/VerificationBanner.tsx`**
   - Top banner showing verification status
   - Conditional rendering based on status

3. **`src/pages/AdminKYC.tsx`**
   - Admin dashboard
   - Pending verifications table
   - Document viewer
   - Approve/Reject actions

### Updated Components:

- **`src/pages/Profile.tsx`** - Added Verification tab
- **`src/components/Layout/Header.tsx`** - Added VerificationBanner
- **`src/App.tsx`** - Added `/admin/verify-users` route
- **`src/lib/firestore.ts`** - Added KYC and email functions

---

## 🔐 Security Considerations

### Admin Access:
- Email whitelist in code (consider moving to Firestore)
- Firebase Auth verification
- Firestore security rules

### Document Storage:
- Images uploaded to Cloudinary
- URLs stored in Firestore
- Access controlled by authentication

### Email Security:
- Use Gmail App Passwords (not regular passwords)
- Store credentials in Firebase Functions config
- Never commit passwords to git

---

## 🚀 Deployment

### Option 1: Firebase Hosting

```bash
# Build the app
npm run build

# Deploy everything
firebase deploy

# Or deploy separately
firebase deploy --only hosting
firebase deploy --only functions
```

### Option 2: Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy functions separately to Firebase
firebase deploy --only functions
```

---

## 📊 Monitoring

### Check Firestore Collections:

- **`users`** - User documents with KYC fields
- **`email_notifications`** - Email queue
- **`notifications`** - In-app notifications

### Monitor Cloud Functions:

```bash
# View execution logs
firebase functions:log

# View specific function
firebase functions:log --only sendEmailNotification

# View errors only
firebase functions:log --only sendEmailNotification --only-errors
```

### Email Delivery:

Check `email_notifications` collection for:
- `sent: true` - Email sent successfully
- `sent: false` + `error` field - Delivery failed

---

## 🐛 Troubleshooting

### Emails Not Sending:

1. **Check Gmail App Password:**
   ```bash
   firebase functions:config:get
   ```

2. **Check Function Logs:**
   ```bash
   firebase functions:log --only sendEmailNotification
   ```

3. **Verify Firestore Trigger:**
   - Check if documents are created in `email_notifications`
   - Check if `sent` field is updated

4. **Common Issues:**
   - Wrong App Password
   - Gmail account requires 2FA
   - Firestore trigger not deployed

### KYC Documents Not Uploading:

1. **Check Cloudinary Config:**
   - Verify `VITE_CLOUDINARY_CLOUD_NAME`
   - Verify `VITE_CLOUDINARY_UPLOAD_PRESET`
   - Ensure preset allows unsigned uploads

2. **Check File Size:**
   - Max 5MB per file

3. **Check Network:**
   - Open browser console
   - Look for upload errors

### Admin Panel Access Denied:

1. **Check Email:**
   - Must be in `ADMIN_EMAILS` whitelist

2. **Check Authentication:**
   - Must be logged in with whitelisted email

---

## 📈 Future Enhancements

### Suggested Improvements:

1. **Admin Dashboard:**
   - Move admin emails to Firestore
   - Add admin user management
   - Add analytics dashboard

2. **Email System:**
   - Use SendGrid/AWS SES for better deliverability
   - Add email templates service
   - Add email preferences for users

3. **KYC System:**
   - Automated ID verification (OCR)
   - Integration with verification APIs
   - Batch approval/rejection

4. **Notifications:**
   - Push notifications (FCM)
   - SMS notifications
   - Notification preferences

---

## 📞 Support

**Email:** rentshare11@gmail.com  
**Phone:** +91 8547652100

---

## ✨ Summary

You now have a fully functional MVP with:

✅ Manual KYC verification workflow  
✅ Admin panel for document review  
✅ Email notifications for all key events  
✅ Verification status banners  
✅ Firebase Cloud Functions integration  
✅ Secure document storage  

**Next Steps:**
1. Deploy to production
2. Test with real users
3. Monitor email delivery
4. Gather feedback
5. Iterate and improve

Happy building! 🎉
