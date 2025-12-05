# Complete Deployment Instructions

## Step 1: Set the Email Password Secret

**Important:** You must set the secret BEFORE deploying.

```bash
firebase functions:secrets:set EMAIL_PASSWORD
```

When prompted, enter: `alvuaukypqrvltsh`

## Step 2: Deploy Functions

```bash
firebase deploy --only functions
```

## If You Get Errors

### Error: "Secret EMAIL_PASSWORD not found"
- Make sure you ran Step 1 first
- The secret must be set before deployment

### Error: "Failed to authenticate"
```bash
firebase login
```

### Error: "No active project"
```bash
firebase use rentshare-5c5eb
```

### Error: "functions.config() has been removed"
- This is already fixed in the code
- Make sure you have the latest `functions/index.js`

## Verify Deployment

After successful deployment:

```bash
firebase functions:list
```

You should see:
- ✅ sendEmailNotification
- ✅ onTransactionCreated
- ✅ onNewMessage
- ✅ onPickupOtpGenerated
- ✅ onReturnOtpGenerated

## Test the Functions

1. Create a booking in your app
2. Check Firebase Console → Functions → Logs
3. Verify emails are being sent

## Troubleshooting

If emails aren't sending:
1. Check function logs: `firebase functions:log`
2. Verify secret is set: The function will fail if secret is missing
3. Check Gmail App Password is correct
4. Verify Gmail account isn't blocked

