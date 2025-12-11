# How to Access KYC Panel as Admin

## Quick Access

### Direct URL:
```
http://localhost:5173/admin/verify-users
```
(Replace with your domain in production)

---

## Step-by-Step Instructions

### 1. **Login as Admin**

You must be logged in with one of these admin email addresses:
- `rentshare11@gmail.com`
- `admin@rentshare.com`
- `gharsha238@gmail.com`

**Login Steps:**
1. Go to the login page: `/login`
2. Enter one of the admin email addresses
3. Enter your password
4. Click "Login"

### 2. **Navigate to KYC Panel**

Once logged in, you have two ways to access:

#### Option A: Direct URL (Fastest)
Type in your browser address bar:
```
http://localhost:5173/admin/verify-users
```

#### Option B: Through Admin Dashboard
1. Go to: `/admin` (Admin Dashboard)
2. Look for KYC verification link (if available in navigation)
3. Or directly type `/admin/verify-users`

---

## Admin Email Whitelist

The KYC panel checks your email against this whitelist:
```typescript
const ADMIN_EMAILS = [
  'rentshare11@gmail.com', 
  'admin@rentshare.com',
  'gharsha238@gmail.com'
];
```

**Important:** Only these email addresses can access the KYC panel. If you're not using one of these emails, you'll be redirected to the homepage.

---

## Features Available in KYC Panel

1. **View Pending Verifications**
   - List of all users with `verificationStatus: 'pending'`
   - Shows user name, email, phone, submission date

2. **View Documents**
   - Click "View Docs" button
   - See Aadhaar Front & Back
   - See PAN Card
   - See Selfie (if uploaded)

3. **Approve Verification**
   - Click "Approve" button
   - Sets `verified: true` and `verificationStatus: 'approved'`
   - Sends email notification to user

4. **Reject Verification**
   - Click "Reject" button
   - Enter rejection reason
   - Sets `verified: false` and `verificationStatus: 'rejected'`
   - Stores rejection reason

---

## Troubleshooting

### Issue: "Unauthorized access" message
**Solution:**
- Make sure you're logged in with one of the whitelisted admin emails
- Check that your email is exactly matching (case-insensitive)
- Try logging out and logging back in

### Issue: Redirected to homepage
**Solution:**
- Your email is not in the admin whitelist
- Contact the developer to add your email to the whitelist
- Or use one of the existing admin emails

### Issue: Page shows "Loading..." forever
**Solution:**
- Check browser console for errors
- Verify Firestore connection
- Check that you have read permissions in Firestore

### Issue: No pending verifications shown
**Solution:**
- This is normal if no users have submitted KYC documents yet
- Check Firestore directly: `users` collection, look for `verificationStatus: 'pending'`

---

## Adding New Admin Email

To add a new admin email, edit `src/pages/AdminKYC.tsx`:

```typescript
const ADMIN_EMAILS = [
  'rentshare11@gmail.com', 
  'admin@rentshare.com',
  'gharsha238@gmail.com',
  'your-new-admin@email.com' // Add here
].map((email) => email.toLowerCase());
```

---

## Alternative: Use New Admin Panel Layout

The new admin panel is at `/admin` with layout navigation. However, KYC verification is currently a separate page at `/admin/verify-users`.

You can access it through:
- Direct URL: `/admin/verify-users`
- Or integrate it into the admin layout navigation if needed

---

## Security Notes

1. **Email-based access control** - Only whitelisted emails can access
2. **Firestore rules** - Additional security at database level
3. **Protected route** - Requires authentication
4. **Auto-redirect** - Non-admin users are automatically redirected

---

## Quick Reference

| Item | Value |
|------|-------|
| **URL** | `/admin/verify-users` |
| **Full URL (Local)** | `http://localhost:5173/admin/verify-users` |
| **Required Role** | Admin (email whitelist) |
| **Component** | `src/pages/AdminKYC.tsx` |
| **Route** | Defined in `src/App.tsx` line 148-155 |





