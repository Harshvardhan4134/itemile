# KYC Data Storage Locations

## Overview
KYC (Know Your Customer) data is stored in two locations:
1. **Cloudinary** - For actual document images/files
2. **Firestore** - For metadata and document URLs

---

## 1. Firestore Storage

### Collection Path
```
users/{userId}
```

### Full URL Format
```
https://console.firebase.google.com/project/{YOUR_PROJECT_ID}/firestore/data/users/{USER_ID}
```

### Stored Fields in User Document

#### Document URLs (Cloudinary URLs):
- `aadharFrontUrl` - String URL to Aadhaar front image
- `aadharBackUrl` - String URL to Aadhaar back image  
- `panUrl` - String URL to PAN card image
- `selfieUrl` - String URL to selfie image (optional)

#### Status Fields:
- `verificationStatus` - String: 'pending' | 'approved' | 'rejected'
- `verified` - Boolean: true/false
- `submittedAt` - Timestamp: When documents were submitted
- `verifiedAt` - Timestamp: When verification was completed
- `rejectionReason` - String: Reason if rejected

### Code Reference
```typescript
// Firestore path: users/{uid}
const userRef = doc(db, 'users', uid);
await updateDoc(userRef, {
  aadharFrontUrl: 'https://res.cloudinary.com/...',
  aadharBackUrl: 'https://res.cloudinary.com/...',
  panUrl: 'https://res.cloudinary.com/...',
  selfieUrl: 'https://res.cloudinary.com/...',
  verificationStatus: 'pending',
  submittedAt: serverTimestamp()
});
```

---

## 2. Cloudinary Storage

### Folder Path
```
rent-share/kyc
```

### Upload API
```
https://api.cloudinary.com/v1_1/{CLOUD_NAME}/upload
```

### Storage Structure
All KYC documents are uploaded to Cloudinary with:
- **Folder**: `rent-share/kyc`
- **Resource Type**: Auto-detected (image/video)
- **Upload Preset**: Configured via `VITE_CLOUDINARY_UPLOAD_PRESET`

### Document Types Stored
1. Aadhaar Card Front
2. Aadhaar Card Back
3. PAN Card
4. Selfie (optional)

### Code Reference
```typescript
// Upload to Cloudinary
uploadToCloudinary(documents.aadharFront, 'rent-share/kyc')
uploadToCloudinary(documents.aadharBack, 'rent-share/kyc')
uploadToCloudinary(documents.pan, 'rent-share/kyc')
uploadToCloudinary(documents.selfie, 'rent-share/kyc')
```

### Cloudinary URL Format
```
https://res.cloudinary.com/{CLOUD_NAME}/image/upload/v{version}/rent-share/kyc/{filename}
```

---

## 3. Admin Access

### Firestore Console
Access KYC data via:
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Open `users` collection
4. Find user document by UID or email
5. View KYC fields (aadharFrontUrl, aadharBackUrl, panUrl, etc.)

### Admin Page URL
```
/admin/verify-users
```

### Query Pending KYC
```typescript
// Firestore query
const usersRef = collection(db, 'users');
const q = query(
  usersRef,
  where('verificationStatus', '==', 'pending'),
  orderBy('submittedAt', 'desc')
);
```

---

## 4. Security Rules

### Firestore Rules
- Users can submit KYC documents (update own profile with KYC fields)
- Only admins can approve/reject KYC
- Users can read other user profiles but not KYC document URLs

### Cloudinary
- Documents are stored with secure URLs
- Access controlled via Firestore rules
- Images are not publicly accessible without proper authentication

---

## 5. Example Data Flow

1. **User Uploads Documents**
   - Documents uploaded to Cloudinary → `rent-share/kyc/` folder
   - Cloudinary returns secure URLs

2. **Store in Firestore**
   - URLs stored in `users/{uid}` document
   - Status set to `pending`
   - `submittedAt` timestamp recorded

3. **Admin Reviews**
   - Admin accesses `/admin/verify-users`
   - Views documents via stored Cloudinary URLs
   - Approves or rejects

4. **Status Update**
   - If approved: `verified = true`, `verificationStatus = 'approved'`
   - If rejected: `verified = false`, `verificationStatus = 'rejected'`, `rejectionReason` set

---

## 6. Environment Variables Required

```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

---

## Quick Access Links

- **Firebase Console**: https://console.firebase.google.com
- **Cloudinary Dashboard**: https://cloudinary.com/console
- **Admin KYC Page**: `/admin/verify-users`
- **User Profile Page**: `/profile` (for submitting KYC)





