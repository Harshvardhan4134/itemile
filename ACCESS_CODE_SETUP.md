# Access Code Setup Guide

This guide explains how to set up and manage access codes for the Lendlly waitlist system.

## Overview

Lendlly uses an access code system to control who can use the platform. After signing in, users must enter a valid access code before they can access any protected routes.

## How It Works

1. Users sign in with their credentials
2. After authentication, they are prompted to enter an access code
3. The access code is verified against the `accessCodes` collection in Firestore
4. If valid, the user is granted access and can use the platform
5. Access status is stored in the user's document (`hasAccess: true`)

## Creating Access Codes

Access codes are stored in the `accessCodes` collection in Firestore. Each access code document should have the following structure:

```javascript
{
  code: "YOUR_CODE_HERE",           // The access code (uppercase, no spaces)
  active: true,                      // Whether the code is active
  maxUses: 100,                      // Optional: Maximum number of times this code can be used
  currentUses: 0,                    // Current number of times used
  createdAt: Timestamp,              // When the code was created
  expiresAt: Timestamp               // Optional: When the code expires
}
```

### Creating Access Codes via Firebase Console

1. Go to Firebase Console → Firestore Database
2. Navigate to the `accessCodes` collection
3. Click "Add document"
4. Set the document ID (can be auto-generated or use the code itself)
5. Add the following fields:
   - `code` (string): The access code (e.g., "EARLY2024")
   - `active` (boolean): Set to `true`
   - `currentUses` (number): Set to `0`
   - `maxUses` (number, optional): Maximum uses (e.g., `100`)
   - `createdAt` (timestamp): Current timestamp
   - `expiresAt` (timestamp, optional): Expiration date

### Example Access Code Document

```json
{
  "code": "EARLY2024",
  "active": true,
  "maxUses": 500,
  "currentUses": 0,
  "createdAt": "2024-01-15T10:00:00Z",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

## Access Code Features

### Unlimited Use Codes
To create a code with unlimited uses, simply omit the `maxUses` field or set it to a very high number.

### Single-Use Codes
Set `maxUses: 1` to create a code that can only be used once.

### Expiring Codes
Add an `expiresAt` timestamp to create codes that expire after a certain date.

### Deactivating Codes
Set `active: false` to deactivate a code without deleting it. This prevents new users from using it while preserving usage statistics.

## Admin Access

Admins and moderators (users with `systemRole: 'admin'` or `systemRole: 'moderator'`) automatically have access to the platform without needing an access code.

## User Access Status

Once a user successfully enters an access code:
- Their user document is updated with `hasAccess: true`
- `accessGrantedAt` timestamp is set
- Access is cached in localStorage for faster subsequent checks
- The access code's `currentUses` count is incremented

## Security Rules

The Firestore security rules allow:
- **Read**: Any authenticated user can read access codes (to verify them)
- **Create/Update/Delete**: Only admins can manage access codes

Users can update their own `hasAccess` and `accessGrantedAt` fields when granted access.

## Testing

To test the access code system:

1. Create a test access code in Firestore
2. Sign in with a test account
3. You should see the access code dialog
4. Enter the test code
5. You should be granted access and redirected to the app

## Troubleshooting

### Users can't access the platform even with valid codes
- Check that the code document has `active: true`
- Verify the code matches exactly (case-sensitive, no spaces)
- Check if `maxUses` has been reached
- Verify the code hasn't expired (`expiresAt`)

### Access code dialog not showing
- Check browser console for errors
- Verify the user is authenticated
- Check Firestore security rules are deployed correctly

### Users bypassing access code
- Verify `ProtectedRoute` is wrapping all protected routes
- Check that `checkUserAccess` is being called correctly
- Ensure admins/moderators are the only ones with automatic access

