# 🚀 MVP Quick Start Guide

## What's New?

### ✅ Manual KYC Verification
- Users can upload Aadhaar + PAN documents
- Admin panel at `/admin/verify-users`
- Email notifications on approval/rejection
- Verification status banners

### ✅ Email Notifications
- Verification updates
- New rental requests
- Chat messages
- All via Firebase Cloud Functions

---

## 🏃‍♂️ Quick Setup (5 Minutes)

### 1. Install Dependencies

```bash
npm install
cd functions && npm install && cd ..
```

### 2. Set Environment Variables

Create `.env`:

```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_PROJECT_ID=your_project
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary
VITE_CLOUDINARY_UPLOAD_PRESET=your_preset
```

### 3. Configure Email (Gmail App Password)

```bash
firebase login
firebase functions:config:set email.user="rentshare11@gmail.com"
firebase functions:config:set email.password="your-16-char-password"
```

Get password from: https://myaccount.google.com/apppasswords

### 4. Deploy Functions

```bash
firebase deploy --only functions
```

### 5. Run Locally

```bash
npm run dev
```

---

## 📱 User Features

### KYC Verification (Users)

1. **Submit Documents:**
   - Go to: Profile → Verification tab
   - Upload Aadhaar (front/back), PAN
   - Click "Submit for Verification"

2. **Track Status:**
   - Yellow banner = Pending
   - Green banner = Approved ✅
   - Red banner = Rejected (with reason)

3. **Receive Emails:**
   - Approval/rejection notification sent automatically

### View Transactions

- Go to: Transactions page
- See pending, active, completed rentals
- Email sent to owner on new rental request

### Chat Messages

- Go to: Chat page
- Send messages
- Recipient gets email notification

---

## 🧑‍💼 Admin Features

### Access Admin Panel

1. Login with admin email (`rentshare11@gmail.com`)
2. Go to: `/admin/verify-users`

### Review KYC Submissions

1. See all pending verifications
2. Click "View Docs" to see uploaded images
3. Click "Approve" ✅ or "Reject" ❌
4. For rejections, provide a reason
5. User receives email automatically

---

## 🗂 File Structure

```
├── src/
│   ├── components/
│   │   ├── KYCVerification.tsx       # KYC upload form
│   │   ├── VerificationBanner.tsx    # Status banner
│   │   └── Layout/Header.tsx         # Updated with banner
│   ├── pages/
│   │   ├── AdminKYC.tsx              # Admin verification panel
│   │   └── Profile.tsx               # Updated with KYC tab
│   └── lib/
│       └── firestore.ts              # KYC & email functions
├── functions/
│   ├── index.js                      # Cloud Functions
│   └── package.json                  # Functions dependencies
├── firebase.json                     # Firebase config
├── MVP_SETUP_GUIDE.md               # Full setup guide
└── FIREBASE_FUNCTIONS_SETUP.md      # Functions guide
```

---

## 🧪 Testing

### Test KYC Flow

1. Create test account
2. Upload any images as documents
3. Login as admin: `rentshare11@gmail.com`
4. Go to `/admin/verify-users`
5. Approve or reject
6. Check user's email inbox

### Test Email Notifications

1. Request to rent an item → Owner gets email
2. Send a chat message → Recipient gets email
3. Submit KYC → Get approval/rejection email

---

## 🐛 Troubleshooting

### Emails not sending?

```bash
# Check config
firebase functions:config:get

# Check logs
firebase functions:log --only sendEmailNotification

# Redeploy
firebase deploy --only functions
```

### Can't access admin panel?

Check `src/pages/AdminKYC.tsx`:
```typescript
const ADMIN_EMAILS = ['rentshare11@gmail.com', 'your-email@example.com'];
```

### Documents not uploading?

1. Check Cloudinary config in `.env`
2. Verify upload preset allows unsigned uploads
3. Check browser console for errors

---

## 📚 Full Documentation

- **MVP Setup Guide:** `MVP_SETUP_GUIDE.md`
- **Firebase Functions:** `FIREBASE_FUNCTIONS_SETUP.md`
- **Product Requirements:** `COMPREHENSIVE_PRD.md`

---

## 🎯 What's Working

✅ User KYC document upload  
✅ Admin verification panel  
✅ Email notifications (verification, rentals, chats)  
✅ Verification status banners  
✅ Firebase Cloud Functions integration  
✅ Secure document storage (Cloudinary)  
✅ In-app + email notifications  

---

## 🚀 Deploy to Production

```bash
# Build frontend
npm run build

# Deploy everything
firebase deploy

# Or deploy separately
firebase deploy --only hosting
firebase deploy --only functions
```

---

## 📞 Support

**Email:** rentshare11@gmail.com  
**Phone:** +91 8547652100

---

**Ready to go! 🎉**

Start the dev server and test the new features:
```bash
npm run dev
```

Then visit:
- User KYC: http://localhost:5173/profile (Verification tab)
- Admin Panel: http://localhost:5173/admin/verify-users
