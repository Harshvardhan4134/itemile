# Deployment Issue: Admin Panel Not Working on Production

## Issue Summary
The admin panel works perfectly on localhost but fails to load on the deployed (Vercel) version.

## Environment Details
- **Localhost**: ✅ Working (http://localhost:8081/admin)
- **Production**: ❌ Not Working (Vercel deployment)
- **Framework**: React + Vite + TypeScript
- **Backend**: Firebase (Auth + Firestore)
- **Deployment Platform**: Vercel

## What Works on Localhost ✅
1. Admin panel loads at `/admin`
2. All navigation works (Dashboard, Users, Listings, Reports, Settings)
3. Real-time data fetching from Firestore
4. All buttons functional:
   - Preview listings
   - Contact owner
   - Takedown/Restore listings
   - View user listings
5. Separate tabs for active and removed listings
6. Firestore security rules allow admin access

## What Fails on Production ❌
- Admin panel either:
  - Shows 404 error
  - Shows blank page
  - Shows "Unauthorized access"
  - Shows "Missing or insufficient permissions"

## Root Causes Identified

### 1. **Firestore Security Rules Not Deployed**
**Issue**: Updated `firestore.rules` may not be deployed to production Firebase project.

**Solution**:
```bash
# Deploy rules to production
firebase deploy --only firestore:rules

# Or manually update in Firebase Console
# 1. Go to https://console.firebase.google.com/
# 2. Select your project
# 3. Firestore Database → Rules → Paste rules → Publish
```

**Rules must include**:
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

// Rules for reports and admin_actions collections
match /reports/{reportId} {
  allow create: if request.auth != null;
  allow read, update, delete: if isAdmin();
}

match /admin_actions/{actionId} {
  allow create, read: if isAdmin();
}
```

### 2. **Admin Custom Claims Not Set**
**Issue**: User account doesn't have `role: 'admin'` custom claim on production Firebase Auth.

**Solution**:
```bash
# Run the admin role script with your production UID
node scripts/set-admin-role.js <YOUR_PRODUCTION_USER_UID>
```

**Or manually in Firebase Console**:
1. Authentication → Users → Select user
2. Set custom claims:
```json
{
  "role": "admin"
}
```

### 3. **Vercel Caching / Service Worker Issues**
**Issue**: Vercel or browser is serving old cached version without admin routes.

**Solution**:
```bash
# Force redeploy to Vercel
git push origin main --force-with-lease

# Clear browser cache
# 1. Open DevTools (F12)
# 2. Application tab → Clear storage → Clear site data
# 3. Or hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
```

### 4. **Environment Variables**
**Issue**: Firebase config might differ between development and production.

**Check**: `src/lib/firebase.ts` uses correct production Firebase project credentials.

### 5. **Build Configuration**
**Issue**: Vite might not be properly handling React Router routes for SPA.

**Verify** `vercel.json` has proper rewrites:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## Debugging Steps

### Step 1: Check Firebase Rules
```bash
# Test if rules are deployed
firebase deploy --only firestore:rules
```

### Step 2: Verify Custom Claims
1. Login to production site
2. Open browser console
3. Run:
```javascript
firebase.auth().currentUser.getIdTokenResult()
  .then(token => console.log('Custom claims:', token.claims))
```

Expected output should include `role: 'admin'`

### Step 3: Check Network Requests
1. Open DevTools → Network tab
2. Navigate to `/admin`
3. Look for:
   - 404 errors on route
   - 403/Permission denied on Firestore requests
   - Failed authentication

### Step 4: Check Firestore Security Rules in Console
1. Go to Firebase Console
2. Firestore Database → Rules
3. Verify rules match `firestore.rules` file
4. Check "Rules" published timestamp

### Step 5: Redeploy Everything
```bash
# 1. Deploy Firestore rules
firebase deploy --only firestore:rules

# 2. Set admin role for production user
node scripts/set-admin-role.js <PRODUCTION_UID>

# 3. Commit and push latest code
git add .
git commit -m "Fix admin panel for production"
git push origin main

# 4. Hard refresh browser (Ctrl+Shift+R)
```

## Files Changed in This Update

### New Files:
- `src/hooks/useAuthRole.ts` - Custom hook for role-based access
- `src/components/AdminRoute.tsx` - Route guard for admin pages
- `src/pages/admin/AdminLayout.tsx` - Admin panel layout
- `src/pages/admin/AdminDashboard.tsx` - Dashboard with metrics
- `src/pages/admin/AdminUsers.tsx` - User management
- `src/pages/admin/AdminListings.tsx` - Listing moderation (with tabs)
- `src/pages/admin/AdminReports.tsx` - Report management
- `src/pages/admin/AdminSettings.tsx` - Settings placeholder
- `scripts/set-admin-role.js` - Script to set admin custom claims
- `ADMIN_PANEL_GUIDE.md` - Complete documentation

### Modified Files:
- `firestore.rules` - Added admin rules for new collections
- `src/lib/firestore.ts` - Extended interfaces, added helper functions
- `src/App.tsx` - Added admin routes
- `src/pages/AdminKYC.tsx` - Added new admin email to whitelist

## Expected Behavior After Fix

1. Navigate to `https://your-domain.vercel.app/admin`
2. If not logged in → Redirect to `/login`
3. If logged in but not admin → Redirect to `/explore`
4. If logged in as admin → Show admin dashboard
5. All tabs accessible (Dashboard, Users, Listings, Reports, Settings)
6. Real data loads from Firestore
7. All buttons work (Preview, Takedown, Restore, etc.)
8. Removed listings show in separate tab

## Quick Checklist

- [ ] Firebase rules deployed to production
- [ ] Admin custom claim set for production user (`role: 'admin'`)
- [ ] Latest code pushed to Vercel
- [ ] Browser cache cleared
- [ ] Service account JSON file exists in `scripts/` (gitignored)
- [ ] User signed out and signed back in (to refresh token)
- [ ] Firestore indexes created (if needed)
- [ ] No console errors in browser DevTools
- [ ] Network tab shows successful Firestore requests

## Additional Notes

### Service Account Setup
To run `set-admin-role.js`, you need:
1. Download service account JSON from Firebase Console
   - Project Settings → Service Accounts → Generate new private key
2. Save as `scripts/service-account.json`
3. This file is gitignored for security

### Token Refresh
After setting custom claims, user must:
1. Sign out
2. Sign back in
3. Or force token refresh:
```javascript
firebase.auth().currentUser.getIdToken(true)
```

### Testing Locally After Changes
```bash
npm run build
npm run preview
# Test at http://localhost:4173
```

## Related Issues
- Service worker caching issues (#TBD)
- Firestore permission errors (#TBD)
- React Router SPA deployment (#TBD)

## Status
🔴 **Open** - Awaiting production deployment verification

## Priority
🔥 **High** - Admin panel is critical for content moderation

---

**Created**: November 12, 2025  
**Last Updated**: November 12, 2025  
**Assignee**: Dev Team  
**Labels**: `bug`, `deployment`, `production`, `firebase`, `vercel`

