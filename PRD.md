# Product Requirements Document (PRD)

**Product:** Lendlly (Rent-share) — peer-to-peer rental and swap marketplace  
**Stack (as implemented):** React (Vite), TypeScript, Firebase Auth + Firestore, Cloudinary (media), Razorpay (payments), Google Maps  
**Document type:** PRD with **working logic** aligned to the current codebase (not a future wishlist).

---

## 1. Product overview

### 1.1 Purpose

Lendlly connects people who want to **rent** or **swap** physical items locally. Owners list items; renters discover them (Explore, maps, search), book with dates and optional online payment, coordinate via chat, and complete handoffs using OTP-style confirmation flows. Admins moderate users, listings, KYC, and bookings.

### 1.2 Primary user goals

| Persona | Goals |
|--------|--------|
| Renter | Find items by city/search/map, book safely, pay when enabled, chat with owner, complete pickup/return. |
| Owner | List items (subject to category rules), manage bookings, receive payouts, build trust/reviews. |
| Admin / Moderator | Verify KYC, manage users (warn/ban, trust, referral audit), listings, reports, bookings. |

### 1.3 Core surfaces (routes)

| Path | Access | Purpose |
|------|--------|---------|
| `/` | Public | Marketing / landing (Index). |
| `/signup`, `/login`, `/forgot-password` | Public | Account creation and sign-in. |
| `/explore` | **Protected** | Main discovery: map, listings grid, community posts, requests context. |
| `/item/:id` | Public | Listing detail, booking, like/comment. |
| `/post` | Protected | Create listing. |
| `/post-request`, `/requests` | Protected | Item requests feed. |
| `/dashboard`, `/transactions`, `/owner-bookings` | Protected | User dashboards and booking management. |
| `/transactions/:transactionId` | Protected | Transaction-scoped **chat**. |
| `/chat`, `/chat/:chatId` | Protected | Chat inbox. |
| `/profile` | Protected | Profile, KYC uploads, payout details, referral code. |
| `/notifications` | Protected | In-app notifications. |
| `/payment`, `/payment-success` | Mixed | Checkout continuation / success. |
| `/vendor/:ownerId` | Public | Storefront for an owner. |
| `/admin/*` | Admin JWT claim `role`: `admin` or `moderator` | Admin shell: dashboard, users, listings, bookings, reports, settings. |
| `/admin/verify-users` | Authenticated | KYC review UI (legacy path; distinct from `/admin/*`). |

**Note:** `ProtectedRoute` requires Firebase Auth; unauthenticated users are redirected to `/login` with `state.from` preserved.

---

## 2. Authentication and identity

### 2.1 Methods

- **Email/password:** `createUserWithEmailAndPassword` / `signInWithEmailAndPassword`.
- **Google:** `signInWithPopup` + `GoogleAuthProvider`; optional `VITE_FIREBASE_GOOGLE_CLIENT_ID` for custom parameters.

### 2.2 Firestore user record (`createUser`)

**Working logic:**

1. On first sign-in, a document is created at `users/{uid}` with merge semantics.
2. **Referral code assignment:** Each user receives a unique `referralCode` (generated, collision-checked against `referralCodes/{code}`). A mapping document is written so codes resolve to `uid`.
3. **Signup referral:** If `pendingReferralCode` is provided on create:
   - Code is normalized (trim, uppercase, alphanumeric).
   - `getUidForReferralCode` reads `referralCodes/{code}`.
   - If a referrer `uid` exists and is not self, `referredByUid` is set **only for new profiles** inside the same `createUser` transaction path.
4. **Existing users:** Updates avoid overwriting admin-only or sensitive fields; `createUser` strips `verified` / `wallet` / `rating` from non-create merges per rules expectations.

### 2.3 Google sign-in — one-time referral dialog (new users only)

**Working logic (`GoogleAuth.tsx`):**

1. After popup success, `getAdditionalUserInfo(result).isNewUser` is read from Firebase.
2. `createUser` runs (with optional `pendingReferralCode` from signup form if present).
3. `getUser(uid)` loads the profile.
4. **Referral dialog is shown if and only if:**  
   `isNewUser === true` **and** `referredByUid` is absent **and** the user did **not** already submit a code via the email signup form (`pendingReferralCode`).
5. Dialog actions:
   - **Skip** / close / **×**: completes auth flow and invokes parent `onSuccess` (e.g. navigate to Explore).
   - **Apply code:** calls `applyReferralCodeIfEligible(uid, code)`:
     - Fails if code empty/invalid, user missing, already has `referredByUid`, or code maps to self.
     - On success: `updateDoc` sets `referredByUid` (allowed by Firestore rules for normal profile updates).
6. Double navigation is prevented with a ref guard after completion.

### 2.4 Roles

- **`systemRole` on `User`:** `'user' | 'moderator' | 'admin'` (Firestore).
- **`AdminRoute`:** Allows access if JWT custom claim `role` is `admin`, or `moderator` when `allowModerator` is true (default). No claim → redirect to `/explore`.
- **Waitlist / access:** `hasAccess` and `accessGrantedAt` can gate product use; `checkUserAccess` returns true for admin/moderator or `hasAccess === true`.

### 2.5 Post-login location prompt

**Working logic (`ProtectedRoute.tsx`):**

- After auth, if geolocation permission state is `prompt`, a `LocationPermissionDialog` may appear once per user (tracked via `localStorage` key `location_permission_requested_{uid}`).
- Granted/denied states skip or mark requested accordingly.

---

## 3. Referral system

### 3.1 Data model

| Field / collection | Meaning |
|--------------------|--------|
| `users.referralCode` | User’s shareable code. |
| `users.referredByUid` | Optional; referrer’s uid, set once. |
| `referralCodes/{code}` | `{ uid, createdAt }` for reverse lookup. |

### 3.2 Resolution and application

- **`getUidForReferralCode(raw)`:** Normalizes input; minimum length 4; reads `referralCodes/{code}`.
- **`applyReferralCodeIfEligible(uid, raw)`:** For post-signup (e.g. Google dialog); only writes `referredByUid` if not already set.

### 3.3 Admin visibility (`AdminUsers.tsx`)

**Working logic:**

- `referralCounts`: for each user id, count of users where `referredByUid === that id`.
- `referralsByReferrer`: map of referrer uid → list of referee `User` records (sorted by `createdAt` desc).
- Row shows code, signup count, **View signups** (dialog with name, email, joined date, uid snippet).
- **Referred by** line shows referrer **name** when that uid exists in the loaded user set.
- **Filters (popover):** status (active/banned), role, KYC (required/exempt), referrals (has signups / was referred); composed with text search on name, email, phone, referral code.

---

## 4. Explore and discovery

### 4.1 Data loading

- **Listings:** `getListings()` → `listingsRaw` in state.
- **Requests / message posts:** Fetched in parallel where authenticated rules allow.
- **Owner map:** For business grouping, owner profiles loaded for distinct `ownerId`s.

### 4.2 Location and city selection

**Client state:**

- `selectedCityFromStorage` from `localStorage` key `lendlly_selected_city` (set by header/city UI).
- GPS / manual map flows maintain `userLocation`, `attemptedGeolocation`, `isUpdatingLocation`, optional `manualLocation`.

**Listing filter — `applyExploreLocationFilter(listingsRaw, selectedCityFromStorage)` (working logic):**

1. If **no city** or city is **`Current Location`**: return **all** `listingsRaw` (no radius filter).  
   - **Rationale implemented in code:** Previously a ~120 km radius around GPS caused the grid to **empty** after the map finished refreshing when listings were far from the pin. GPS now **centers the map** only; the grid stays full-catalog for “Current Location.”
2. If a **named city** is selected: keep listings that:
   - Match `listing.city` (case-insensitive), OR
   - Have no city but have `location` within ~100 km of that city’s preset coordinates (`CITY_COORDS`), OR
   - Have neither city nor location (still shown).

### 4.3 Map (`LiveMap.tsx`)

- Renders listings (and optional requests) as markers; user marker when `userLocation` is set.
- **Refresh** triggers parent `onLocationUpdate` (Explore’s GPS watch / fallback pipeline).
- Listing images in map info windows fall back to `/placeholder.svg` when missing.

### 4.4 Shop grid and categories

- Category sidebar counts derive from **filtered** `listings` plus search/category filters in Explore.
- Pagination: `LISTINGS_PER_PAGE` (e.g. 9) with `listingsPage` state.

---

## 5. Listings and category policy

### 5.1 Category rules (`categoryRules.ts`)

**Working logic:**

| Classification | Behavior |
|----------------|----------|
| **Direct** (`DIRECT_LISTING_CATEGORIES`) | Can be publicly listed on Explore (subject to other filters). |
| **Request-first** (`REQUEST_FIRST_CATEGORIES`) | Not the primary public-list path; demand driven via requests / messaging. |
| **Approval-required** (`APPROVAL_REQUIRED_CATEGORIES`) | High-trust categories may need moderation before going live (product policy). |
| **Restricted** (`RESTRICTED_CATEGORIES`) | Blocked (currently empty list in code). |

Helpers: `getCategoryListingType`, `isDirectListingAllowed`, `isRequestFirstAllowed`, etc.

### 5.2 Listing document (`Listing` interface)

Notable fields: `ownerId`, pricing (`rentPerDay`, `price.*`), `swapAllowed`, `category`, `location` (`GeoPoint`), `images[]`, `city`, `available`, `moderation`, `listingType`, `requestEnabled`, `likes`, `comments`, `softDeleted`.

---

## 6. Verification (KYC) and gates

### 6.1 Policy (`verificationPolicy.ts`)

- **`kycExempt === true`:** User passes verification gates without approved KYC.
- Otherwise **`kycRequiredDocKeys`** (subset of aadhar front/back, PAN, selfie) defaults to Aadhaar + PAN if unset.
- **`passesVerificationGate(user)`:** true if exempt or `verificationStatus === 'approved'`.

### 6.2 Flows that consult verification

Rent, pay, and post flows use `passesVerificationGate` (and UI banners) so non-exempt users must be **approved** before sensitive actions.

### 6.3 Admin KYC policy (`AdminUsers` dialog)

- Admin sets **verification required** vs **exempt**.
- If required, selects mandatory document types; persists `kycExempt`, `kycRequiredDocKeys` and logs admin action.

---

## 7. Bookings, transactions, and payments

### 7.1 Transaction model (`Transaction`)

- Links `ownerId`, `renterId`, optional `listingId` / `requestId`.
- **Status machine** includes: `pending`, `pickup_otp_generated`, `picked_up`, `return_otp_generated`, `returned`, `completed`, `active`, `disputed`, `cancelled`, etc.
- **OTP fields** for pickup/return with expiry timestamps.
- **Financials:** `amount`, `totalRent`, `deposit`, `serviceFee`, `insuranceFee`, Razorpay ids, `paymentStatus`, `paymentSplit` (marketplace split metadata).

### 7.2 Payments

- Razorpay integration in `lib/razorpay.ts` and payment pages/dialogs.
- Success/callback handling on `PaymentSuccess` / `PaymentPage`.

### 7.3 Chat

- **Transaction chat:** route `/transactions/:transactionId` loads `Chat` for that booking.
- **Inbox:** `/chat` uses `ChatInbox`; queries scoped by Firestore rules to participants.

---

## 8. Trust, moderation, and safety

- **Trust score / flags:** `trustScore`, `flagsCount`; admin can **warn** (adjust trust via `adjustUserTrustMetrics`) and **ban** (`banned: true`, trust 0) with audit logging (`logAdminAction`).
- **Listing moderation:** `moderation.status` (`active`, `flagged`, `removed`, `pending_review`), reasons, reviewer metadata.
- **Banned users:** Actions disabled in admin UI where `user.banned`.

---

## 9. Admin console

### 9.1 Access

- JWT custom claims: `role: 'admin' | 'moderator'` (see `useAuthRole`, `AdminRoute`).
- Firestore `users.systemRole` is related product data; route gating uses **claims**.

### 9.2 Modules (under `/admin/*`)

| Module | Purpose |
|--------|---------|
| Dashboard | High-level stats / entry. |
| Users | Search, filters, referrals, trust, KYC policy, warn, ban, view listings, payout details (decrypted for admin). |
| Listings | Moderation / inventory oversight. |
| Bookings | Transaction oversight. |
| Reports | User reports / flags. |
| Settings | Configuration. |

### 9.3 Audit

- `logAdminAction` records actor, action type, target, reason, metadata (implementation in `firestore.ts`).

---

## 10. Notifications and email

- **In-app:** `notifications` collection; types include rental request, message, transaction update, verification approved/rejected, request match, nearby request/listing, etc.
- **Email queue:** `email_notifications` for outbound messages (server-side or Cloud Functions expected for actual send).

---

## 11. Media and security

- **Images:** Upload via `uploadMultipleImages` (Cloudinary) for listings, posts, profile.
- **Payout fields:** Stored encrypted (`encryption.ts`); admin payout dialog decrypts for display.
- **Terms:** Explore uses versioned localStorage keys for terms acceptance (`TermsNotification` / related helpers).

---

## 12. Non-functional requirements (as implemented)

| Area | Implementation |
|------|----------------|
| Hosting | Static SPA (Vite build); Firebase project per env. |
| Auth persistence | Firebase Auth session; `onAuthStateChanged` across app. |
| Rules | `firestore.rules` — users can update own profile except admin-only verification fields; separate rule for KYC doc uploads; `referralCodes` readable for code resolution. |
| Performance | Listings fetched in bulk; client-side filter/sort/pagination on Explore. |
| Maps | Requires `VITE_GOOGLE_MAPS_API_KEY`. |

---

## 13. Known product behaviors (edge cases)

1. **Explore + Current Location:** Grid shows **all** listings that pass city/search filters; map pin reflects GPS/manual location.
2. **New Google user + referral:** Dialog shows once per new account if no referrer attached and no code was passed from signup form.
3. **Referral code after signup:** `applyReferralCodeIfEligible` cannot override an existing `referredByUid`.
4. **Admin route:** Driven by **JWT claims**, not only Firestore `systemRole` — claims must be set in Firebase for admin users.

---

## 14. Document maintenance

- Update this PRD when adding routes, changing `applyExploreLocationFilter`, referral flows, or transaction status semantics.
- **Source of truth** for behavior is the code paths referenced by section (primarily `firestore.ts`, `Explore.tsx`, `GoogleAuth.tsx`, `AdminUsers.tsx`, `ProtectedRoute.tsx`, `categoryRules.ts`, `verificationPolicy.ts`).

---

*End of PRD.*
