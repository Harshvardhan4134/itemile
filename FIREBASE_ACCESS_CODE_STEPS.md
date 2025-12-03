# Step-by-Step: Creating Access Codes in Firebase Console

## Step 1: Create the Collection

1. Go to **Firebase Console** → **Firestore Database**
2. Click **"Start collection"** (if you don't have any collections yet) OR click **"Add collection"**
3. **Collection ID**: Type `accessCodes` (exactly like this, lowercase 'a' and 'c')
4. Click **"Next"**

## Step 2: Create First Document (EARLY2025)

After clicking "Next", you'll see a form to create the first document:

### Document ID
- You can either:
  - Click **"Auto-ID"** (Firebase will generate a random ID) - **RECOMMENDED**
  - OR type `EARLY2025` as the document ID

### Add Fields (Click "Add field" for each one):

1. **Field name**: `code`
   - **Type**: Select `string`
   - **Value**: `EARLY2025` (all uppercase, no spaces)

2. **Field name**: `active`
   - **Type**: Select `boolean`
   - **Value**: `true` (check the box)

3. **Field name**: `currentUses`
   - **Type**: Select `number`
   - **Value**: `0`

4. **Field name**: `createdAt`
   - **Type**: Select `timestamp`
   - **Value**: Click the calendar icon and select today's date/time, OR click "Set to current time"

5. **Field name**: `maxUses` (OPTIONAL - only if you want to limit uses)
   - **Type**: Select `number`
   - **Value**: `100` (or whatever limit you want)
   - **NOTE**: If you want unlimited uses, SKIP this field entirely

6. **Field name**: `expiresAt` (OPTIONAL - only if you want expiration)
   - **Type**: Select `timestamp`
   - **Value**: Select a future date
   - **NOTE**: If you don't want expiration, SKIP this field

7. Click **"Save"**

## Step 3: Create Second Document (LENDLLY25)

1. In the `accessCodes` collection, click **"Add document"**
2. **Document ID**: Click **"Auto-ID"** (or type `LENDLLY25`)
3. Add the same fields as above, but:
   - **`code`**: `LENDLLY25` (instead of EARLY2025)
   - **`active`**: `true`
   - **`currentUses`**: `0`
   - **`createdAt`**: Current timestamp
   - **`maxUses`**: (optional, same as above)
   - **`expiresAt`**: (optional, same as above)
4. Click **"Save"**

## Visual Summary

Your `accessCodes` collection should look like this:

```
accessCodes (collection)
├── [auto-generated-id-1] (document)
│   ├── code: "EARLY2025" (string)
│   ├── active: true (boolean)
│   ├── currentUses: 0 (number)
│   ├── createdAt: [timestamp]
│   ├── maxUses: [optional number]
│   └── expiresAt: [optional timestamp]
│
└── [auto-generated-id-2] (document)
    ├── code: "LENDLLY25" (string)
    ├── active: true (boolean)
    ├── currentUses: 0 (number)
    ├── createdAt: [timestamp]
    ├── maxUses: [optional number]
    └── expiresAt: [optional timestamp]
```

## Important Notes

- ✅ **Collection name** = `accessCodes` (lowercase)
- ✅ **Document ID** = Can be anything (Auto-ID is fine)
- ✅ **Field `code`** = The actual access code users will type (`EARLY2025` or `LENDLLY25`)
- ✅ **Field `active`** = Must be `true` for the code to work
- ✅ **Field `currentUses`** = Starts at `0`, increments automatically when used

## Quick Setup (Unlimited Use Codes)

If you want both codes to work forever with no limits:

**For EARLY2025:**
- `code`: `EARLY2025`
- `active`: `true`
- `currentUses`: `0`
- `createdAt`: [current time]
- (Don't add `maxUses` or `expiresAt`)

**For LENDLLY25:**
- `code`: `LENDLLY25`
- `active`: `true`
- `currentUses`: `0`
- `createdAt`: [current time]
- (Don't add `maxUses` or `expiresAt`)

That's it! Users can now enter either `EARLY2025` or `LENDLLY25` to get access.

