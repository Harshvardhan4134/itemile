# Admin Panel Guide

## ✅ What's Been Implemented

### 1. **Admin Panel Access** (`/admin`)
- Role-based access control using Firebase Custom Claims
- Email-based fallback for whitelisted admins
- Protected routes that require `admin` or `moderator` role

### 2. **Admin Dashboard** (`/admin`)
- Real-time metrics:
  - Open Reports count
  - Flagged Listings count
  - New Users (last 7 days)
  - Reports under review
- All metrics pull from real Firestore data

### 3. **Users Management** (`/admin/users`)
- Table view of all users with:
  - Email, name, phone
  - Trust score (0-100)
  - Flags count
  - System role (user/moderator/admin)
  - Join date
  - Banned status
- Search by email, name, or phone
- **Functional Buttons:**
  - **View Listings**: Opens admin listings filtered by that user
  - **Warn**: Shows notification (full feature coming soon)
  - **Ban**: Shows notification (full feature coming soon)

### 4. **Listings Management** (`/admin/listings`)
- **Two Tabs:**
  - **Active Listings**: Shows all active, flagged, or pending items
  - **Removed / Taken Down**: Shows all items taken down by admins
- Filters:
  - Status (all/active/flagged/removed/pending)
  - Category
  - City
- Each listing card shows:
  - Title, owner, category, city, price, availability
  - Takedown reason (for removed items)
- **Functional Buttons:**
  - **Preview**: Opens listing detail page in new tab
  - **Contact Owner**: Navigates to owner's profile
  - **Takedown**: Opens dialog to remove listing with:
    - Reason selection (prohibited item, copyright, fraud, etc.)
    - Additional notes field
    - Option to strike user (trust -10, flags +1)
    - Option to notify owner by email (coming soon)
  - **Restore**: One-click restore for removed listings

### 5. **Reports Management** (`/admin/reports`)
- Kanban-style view with 3 columns:
  - Open
  - Reviewing
  - Resolved/Dismissed
- Shows report type, reporter, listing, and timestamp
- Buttons for "View Details" and "Start Review" (placeholders)

### 6. **Settings** (`/admin/settings`)
- Placeholder page for future configuration

## 🔧 How It Works

### **Data Flow:**
1. Admin logs in → Firebase Auth checks custom claims
2. `useAuthRole` hook reads `role` from ID token
3. `AdminRoute` component blocks access if not admin/moderator
4. Admin components fetch data using Firestore helper functions:
   - `getAllUsers()`
   - `getAllListings()`
   - `getAllReports()`
5. Actions update Firestore and log to `admin_actions` collection

### **Firestore Security Rules:**
```javascript
function isAdmin() {
  return request.auth != null && 
    (request.auth.token.role == 'admin' ||
     request.auth.token.role == 'moderator' ||
     request.auth.token.email in [
       'rentshare11@gmail.com',
       'admin@rentshare.com',
       'gharsha238@gmail.com'
     ]);
}
```

### **Collections:**
- `users`: Extended with `systemRole`, `trustScore`, `flagsCount`, `banned`
- `listings`: Extended with `moderation` object and `softDeleted` flag
- `reports`: Stores user reports with status tracking
- `admin_actions`: Audit trail of all admin actions

## 🚀 How to Use

### **1. Set Admin Role (First Time Only)**
You need to set the admin role for your account using Firebase Admin SDK:

```bash
# Make sure you have scripts/service-account.json
node scripts/set-admin-role.js <YOUR_USER_UID>
```

**OR** manually in Firebase Console → Authentication → Users → Select user → Custom Claims:
```json
{
  "role": "admin"
}
```

### **2. Deploy Firestore Rules**
The updated rules allow admins to read/write all collections:

```bash
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules
```

**OR** update manually in Firebase Console → Firestore Database → Rules tab.

### **3. Access the Admin Panel**
Navigate to: `http://localhost:8082/admin` (or `/admin` on production)

### **4. Takedown a Listing**
1. Go to **Admin → Listings**
2. Find the listing to remove
3. Click **Takedown**
4. Select reason and optionally:
   - Add notes
   - Strike user (reduces trust score)
   - Notify owner (coming soon)
5. Click **Confirm takedown**
6. Item moves to "Removed / Taken Down" tab

### **5. Restore a Listing**
1. Go to **Admin → Listings**
2. Click **Removed / Taken Down** tab
3. Find the listing
4. Click **Restore**
5. Item returns to active listings

## 📋 Next Steps (Coming Soon)

### **Phase 2 Features:**
- [ ] User warning system with email notifications
- [ ] User ban functionality (disable Firebase Auth)
- [ ] Report detail view with evidence images
- [ ] Report resolution workflow
- [ ] Bulk actions (ban multiple users, remove multiple listings)
- [ ] Admin activity log viewer
- [ ] Email templates management
- [ ] Advanced filters (date range, trust score range)
- [ ] Export data to CSV
- [ ] User impersonation for debugging (view-only)

### **Phase 3 Features:**
- [ ] Automated content moderation using AI
- [ ] Trust score algorithm tuning
- [ ] Dispute resolution workflow
- [ ] Pattern detection (repeated offenders)
- [ ] Community guidelines editor
- [ ] Appeal system for banned users

## 🔒 Security Notes

1. **Always use Firebase Admin SDK** to set custom claims (never client-side)
2. **Audit trail** is maintained in `admin_actions` collection
3. **Soft delete** prevents data loss (items can be restored)
4. **Email-based fallback** ensures access even if claims fail
5. **Role hierarchy**: admin > moderator > user
6. **Firestore rules** enforce server-side security (client checks are UI-only)

## 🐛 Troubleshooting

### **"Missing or insufficient permissions" error**
- Make sure Firestore rules are deployed
- Check your user has `role: 'admin'` in custom claims
- Sign out and sign in again to refresh token

### **Buttons not working**
- Check browser console for errors
- Make sure dev server is running (`npm run dev`)
- Clear browser cache and reload

### **Can't see removed listings**
- Click the "Removed / Taken Down" tab in Listings page
- Make sure listing has `softDeleted: true` in Firestore

### **User UID not found**
Get your UID from:
- Firebase Console → Authentication → Users
- Or from browser console: `firebase.auth().currentUser.uid`

## 📞 Support

For issues or questions, check:
- Firebase Console logs
- Browser console (F12)
- Network tab for API errors
- Firestore rules simulator in Firebase Console

