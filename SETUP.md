# Itemile — Firebase setup

Use a **new** Firebase project (do not share Lendlly's `rentshare-5c5eb`).

## 1. Create the project

1. Open [Firebase Console](https://console.firebase.google.com) → **Add project**
2. Suggested project ID: `itemile-prod` (must match `.firebaserc` or run `firebase use <your-id>`)
3. Enable Google Analytics (optional)

## 2. Enable services

### Authentication

- **Build → Authentication → Sign-in method**
- Enable **Email/Password**
- Enable **Google** (add support email)
- **Authorized domains:** `localhost`, your production domain

### Firestore

- **Build → Firestore Database → Create database**
- Start in **production mode** (rules deploy from this repo)
- Region: `us-central1` or nearest US region

### Storage (optional)

- Enable if you plan to use Firebase Storage later (app uses Cloudinary by default)

## 3. Register the web app

1. **Project settings → Your apps → Web** (`</>`)
2. App nickname: `Itemile Web`
3. Copy config into `.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

4. For Google sign-in, copy **OAuth 2.0 Client ID** (Web client) into `VITE_FIREBASE_GOOGLE_CLIENT_ID`

## 4. CLI login & deploy rules

```bash
npm install
npm run firebase:login
firebase use itemile-prod   # or your project ID
npm run firebase:deploy:rules
```

This deploys `firestore.rules` and composite indexes from `firestore.indexes.json`.

## 5. Admin access (JWT claims)

Admin routes use **custom claims**, not Firestore `systemRole` alone.

1. Sign up once in the app, copy your user **UID** from Firebase Console → Authentication
2. Download service account: **Project settings → Service accounts → Generate new private key**
3. Save as `scripts/service-account.json` (gitignored)
4. Run:

```bash
npm run admin:set-role -- <YOUR_UID>
```

Sign out and sign in again. `/admin` should load.

For moderators: edit `scripts/set-admin-role.js` to set `{ role: "moderator" }`.

## 6. Cloud Functions (optional for now)

Functions still contain Razorpay/email logic from Lendlly. Deploy after Stripe migration:

```bash
cd functions && npm install && cd ..
npm run firebase:deploy:functions
```

Set function env vars in Firebase Console (EMAIL_USER, APP_URL, etc.).

## 7. Local dev

```bash
npm run firebase:sync-config   # updates firebase-messaging-sw.js from .env
npm run dev
```

### Emulators (optional)

```bash
# .env: VITE_USE_FIREBASE_EMULATORS=true
npm run firebase:emulators
```

## 8. Hosting deploy

```bash
npm run firebase:deploy:hosting
```

## Checklist

- [ ] New Firebase project created
- [ ] `.env` filled with web app config
- [ ] Auth providers enabled
- [ ] `npm run firebase:deploy:rules`
- [ ] Admin UID granted via `npm run admin:set-role`
- [ ] Cloudinary + Maps keys in `.env`
