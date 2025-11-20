# Google Maps API Key Setup Guide

## Issue: "Google Maps API key has referer restrictions"

This warning appears because your Google Maps API key has HTTP referer restrictions configured in Google Cloud Console. When the geocoding API is called from your browser, it's being blocked because the referer doesn't match the allowed domains.

## Solution: Add Your Domain to API Key Restrictions

### Step 1: Go to Google Cloud Console
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** > **Credentials**

### Step 2: Edit Your API Key
1. Find your Google Maps API key (the one in your `.env` file as `VITE_GOOGLE_MAPS_API_KEY`)
2. Click on the key to edit it

### Step 3: Configure Application Restrictions
1. Under **Application restrictions**, select **HTTP referrers (web sites)**
2. Click **Add an item** and add your domains:

   **For Development:**
   ```
   http://localhost:*
   http://127.0.0.1:*
   ```

   **For Production:**
   ```
   https://yourdomain.com/*
   https://*.yourdomain.com/*
   ```

   **If using Vercel/Netlify:**
   ```
   https://your-app.vercel.app/*
   https://your-app.netlify.app/*
   ```

### Step 4: Configure API Restrictions
1. Under **API restrictions**, select **Restrict key**
2. Make sure these APIs are enabled:
   - **Geocoding API**
   - **Maps JavaScript API**
   - **Places API** (if you use it)

### Step 5: Save and Deploy
1. Click **Save**
2. Wait 1-2 minutes for changes to propagate
3. Refresh your application

## Alternative: Use Server-Side Geocoding (More Secure)

If you want to keep your API key more secure, you can move geocoding to a server-side function:

1. Create a Cloud Function or API endpoint that handles geocoding
2. Store your API key on the server (not exposed to client)
3. Call your server endpoint instead of Google's API directly

This prevents your API key from being exposed in the browser.

## Current Behavior

Even with referer restrictions, the app will still work - it will just use coordinates instead of city names. The warning is informational and doesn't break functionality.

