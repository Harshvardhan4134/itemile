# Debug: Images Not Loading in Admin Panel

## Issue
Images uploaded via KYC form show broken image icons in admin panel.

## Quick Checks

### 1. Open Browser Console (F12)
Check for errors related to image loading. Look for:
- CORS errors
- 404 errors
- Cloudinary errors

### 2. Check Firestore Data
1. Go to Firebase Console → Firestore
2. Find collection: `users`
3. Find document for user: `gharsha238@gmail.com`
4. Check these fields have valid URLs:
   - `aadharFrontUrl`
   - `aadharBackUrl`
   - `panUrl`
   - `selfieUrl`

### 3. Verify Cloudinary Config
Check if you have Cloudinary configured in your project.

## Solutions

### Solution 1: Check if Cloudinary is Configured

You need a `.env` file with:
```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_preset_name
```

If you don't have Cloudinary set up:
1. Go to https://cloudinary.com/
2. Sign up for free account
3. Get your Cloud Name and create Upload Preset
4. Add to `.env` file

### Solution 2: Test Image URLs

Right-click on broken image → "Copy Image Address"
Paste URL in new tab to see if it loads

### Solution 3: Check CORS Settings

Cloudinary needs to allow your domain. In Cloudinary dashboard:
1. Settings → Security
2. Add allowed domains: `localhost:8082`

### Solution 4: Temporary Fix - Use Direct Links

If Cloudinary is not set up, you can temporarily store image URLs directly in Firestore for testing.

