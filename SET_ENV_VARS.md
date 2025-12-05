# Setting Environment Variables for Firebase Functions

## New Method (firebase-functions v7+)

The new version uses secrets and environment variables instead of `functions.config()`.

## Step 1: Set the Email Password Secret

```bash
firebase functions:secrets:set EMAIL_PASSWORD
```

When prompted, paste your Gmail App Password: `alvuaukypqrvltsh`

## Step 2: Deploy Functions

```bash
firebase deploy --only functions
```

## What's Configured

The code now uses:
- **EMAIL_USER**: Defaults to `lendlly2025@gmail.com` (can be changed in code)
- **EMAIL_PASSWORD**: Set via secret (your Gmail App Password)
- **APP_URL**: Defaults to `https://lendlly.vercel.app` (can be changed in code)

## To Update Secrets Later

```bash
# Update password
firebase functions:secrets:set EMAIL_PASSWORD

# View secrets
firebase functions:secrets:access EMAIL_PASSWORD
```

## Note

The email user and app URL have defaults in the code, so you only need to set the password secret. If you want to change the email or URL, edit `functions/index.js` and update the `defineString` default values.

