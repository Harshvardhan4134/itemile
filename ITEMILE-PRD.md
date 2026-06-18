# Product Requirements Document (PRD)

**Product:** Itemile — US peer-to-peer rental and swap marketplace  
**Relationship to Lendlly:** 100% feature parity on flows and data model; **new visual design, brand, and US localization**  
**Stack:** React (Vite), TypeScript, Firebase Auth + Firestore, Cloudinary, Stripe Connect, Google Maps  
**Document type:** PRD aligned to current Lendlly codebase behavior (source: `PRD.md` + codebase audit)  
**Last updated:** June 2026

---

## 1. Product overview

### 1.1 Purpose

Itemile connects people who want to **rent** or **swap** physical items locally in the United States. Owners list items; renters discover them via Explore (map, grid, search), book with dates and online payment, coordinate in chat, and complete handoffs with OTP-style confirmation. Admins moderate users, listings, identity verification, and bookings.

### 1.2 Design principle (explicit scope)

| In scope | Out of scope (for v1) |
|----------|------------------------|
| New visual identity (color, typography, layout, components) | New product features not in Lendlly |
| US copy, currency, cities, legal | Backend schema redesign |
| Stripe instead of Razorpay | Multi-country support |
| US identity verification | Native mobile apps |

**Rule:** Every user journey in Lendlly must exist in Itemile with equivalent outcomes; only presentation and locale differ.

### 1.3 Primary user goals

| Persona | Goals |
|---------|--------|
| Renter | Find items by city/search/map, book safely, pay online, chat with owner, complete pickup/return. |
| Owner | List items (subject to category rules), manage bookings, receive payouts, build trust/reviews. |
| Admin / Moderator | Verify identity, manage users (warn/ban, trust, referral audit), listings, reports, bookings. |

---

## 2. Routes and access (parity with Lendlly)

| Path | Access | Purpose |
|------|--------|---------|
| `/` | Public | Marketing landing (Itemile design). |
| `/signup`, `/login`, `/forgot-password` | Public | Account creation and sign-in. |
| `/explore` | **Protected** | Main discovery: map, listings grid, community posts, requests context. |
| `/item/:id` | Public | Listing detail, booking, like/comment. |
| `/post` | Protected | Create listing. |
| `/post-request`, `/requests` | Protected | Item requests feed. |
| `/dashboard`, `/transactions`, `/owner-bookings` | Protected | User dashboards and booking management. |
| `/transactions/:transactionId` | Protected | Transaction-scoped **chat**. |
| `/chat`, `/chat/:chatId` | Protected | Chat inbox. |
| `/profile` | Protected | Profile, ID verification, payout details, referral code. |
| `/notifications` | Protected | In-app notifications. |
| `/payment`, `/payment-success` | Mixed | Checkout continuation / success. |
| `/vendor/:ownerId` | Public | Storefront for an owner. |
| `/admin/*` | Admin JWT claim `role`: `admin` or `moderator` | Admin shell: dashboard, users, listings, bookings, reports, settings. |
| `/admin/verify-users` | Authenticated | Identity review UI (legacy path; distinct from `/admin/*`). |
| `/privacy`, `/terms`, `/refund`, `/contact`, `/shipping` | Public | US legal / compliance pages. |

**Note:** `ProtectedRoute` requires Firebase Auth; unauthenticated users are redirected to `/login` with `state.from` preserved.

---

## 3. Authentication and identity

### 3.1 Methods (same as Lendlly)

- **Email/password:** `createUserWithEmailAndPassword` / `signInWithEmailAndPassword`.
- **Google:** `signInWithPopup` + `GoogleAuthProvider`; optional `VITE_FIREBASE_GOOGLE_CLIENT_ID` for custom parameters.
- **Password reset:** `sendPasswordResetEmail`.
- **Admin:** JWT custom claim `role: 'admin' | 'moderator'` + optional email whitelist in Firestore rules.

### 3.2 US-specific auth changes

- Phone field: US format `(XXX) XXX-XXXX` or E.164 `+1...`; remove hardcoded `+91` prefix.
- Optional v1.1: Apple Sign-In (common on iOS US).
- Complete or remove stubbed phone OTP on forgot-password (`signInWithPhoneNumber` is partial in Lendlly).

### 3.3 Firestore user record (`createUser`)

**Working logic (unchanged from Lendlly):**

1. On first sign-in, a document is created at `users/{uid}` with merge semantics.
2. **Referral code assignment:** Each user receives a unique `referralCode` (generated, collision-checked against `referralCodes/{code}`). A mapping document is written so codes resolve to `uid`.
3. **Signup referral:** If `pendingReferralCode` is provided on create:
   - Code is normalized (trim, uppercase, alphanumeric).
   - `getUidForReferralCode` reads `referralCodes/{code}`.
   - If a referrer `uid` exists and is not self, `referredByUid` is set **only for new profiles** inside the same `createUser` transaction path.
4. **Existing users:** Updates avoid overwriting admin-only or sensitive fields; `createUser` strips `verified` / `wallet` / `rating` from non-create merges per rules expectations.

### 3.4 Google sign-in — one-time referral dialog (new users only)

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
     - On success: `updateDoc` sets `referredByUid`.
6. Double navigation is prevented with a ref guard after completion.

### 3.5 Roles

- **`systemRole` on `User`:** `'user' | 'moderator' | 'admin'` (Firestore).
- **`AdminRoute`:** Allows access if JWT custom claim `role` is `admin`, or `moderator` when `allowModerator` is true (default). No claim → redirect to `/explore`.
- **Waitlist / access:** `hasAccess` and `accessGrantedAt` can gate product use; `checkUserAccess` returns true for admin/moderator or `hasAccess === true`.

### 3.6 Post-login location prompt

**Working logic (`ProtectedRoute.tsx`):**

- After auth, if geolocation permission state is `prompt`, a `LocationPermissionDialog` may appear once per user (tracked via `localStorage` key `itemile_location_permission_requested_{uid}`).
- Granted/denied states skip or mark requested accordingly.

---

## 4. Referral system

### 4.1 Data model

| Field / collection | Meaning |
|--------------------|---------|
| `users.referralCode` | User's shareable code. |
| `users.referredByUid` | Optional; referrer's uid, set once. |
| `referralCodes/{code}` | `{ uid, createdAt }` for reverse lookup. |

### 4.2 Resolution and application

- **`getUidForReferralCode(raw)`:** Normalizes input; minimum length 4; reads `referralCodes/{code}`.
- **`applyReferralCodeIfEligible(uid, raw)`:** For post-signup (e.g. Google dialog); only writes `referredByUid` if not already set.

### 4.3 Admin visibility (`AdminUsers.tsx`)

**Working logic:**

- `referralCounts`: for each user id, count of users where `referredByUid === that id`.
- `referralsByReferrer`: map of referrer uid → list of referee `User` records (sorted by `createdAt` desc).
- Row shows code, signup count, **View signups** (dialog with name, email, joined date, uid snippet).
- **Referred by** line shows referrer **name** when that uid exists in the loaded user set.
- **Filters (popover):** status (active/banned), role, KYC (required/exempt), referrals (has signups / was referred); composed with text search on name, email, phone, referral code.

### 4.4 Itemile branding note

Referral code generation logic is unchanged; UI may show codes with Itemile prefix styling (e.g. `ITEM8X3K`).

---

## 5. Explore and discovery

### 5.1 Data loading

- **Listings:** `getListings()` → `listingsRaw` in state.
- **Requests / message posts:** Fetched in parallel where authenticated rules allow.
- **Owner map:** For business grouping, owner profiles loaded for distinct `ownerId`s.

### 5.2 Location and city selection

**Client state:**

- `selectedCityFromStorage` from `localStorage` key `itemile_selected_city` (set by header/city UI).
- GPS / manual map flows maintain `userLocation`, `attemptedGeolocation`, `isUpdatingLocation`, optional `manualLocation`.

**Listing filter — `applyExploreLocationFilter(listingsRaw, selectedCityFromStorage)` (working logic):**

1. If **no city** or city is **`Current Location`**: return **all** `listingsRaw` (no radius filter).  
   - **Rationale:** GPS centers the map only; the grid stays full-catalog for "Current Location."
2. If a **named city** is selected: keep listings that:
   - Match `listing.city` (case-insensitive), OR
   - Have no city but have `location` within ~100 km of that city's preset coordinates (`CITY_COORDS`), OR
   - Have neither city nor location (still shown).

### 5.3 US city presets (replace Lendlly Indian cities)

Replace `CITY_COORDS` in `Explore.tsx` and `CitySelectorDialog.tsx` with US metros, for example:

New York, Los Angeles, Chicago, Houston, Phoenix, Philadelphia, San Antonio, San Diego, Dallas, San Jose, Austin, Jacksonville, San Francisco, Seattle, Denver, Boston, Miami, Atlanta, Minneapolis, Portland.

Default map center: US-centric (e.g. 39.8283, -98.5795 or New York).

### 5.4 Map (`LiveMap.tsx`)

- Renders listings (and optional requests) as markers; user marker when `userLocation` is set.
- **Refresh** triggers parent `onLocationUpdate` (Explore's GPS watch / fallback pipeline).
- Listing images in map info windows fall back to `/placeholder.svg` when missing.

### 5.5 Shop grid and categories

- Category sidebar counts derive from **filtered** `listings` plus search/category filters in Explore.
- Pagination: `LISTINGS_PER_PAGE` (e.g. 9) with `listingsPage` state.
- **Design:** New card layout, filters UI, map chrome — behavior identical to Lendlly.

---

## 6. Listings and category policy

### 6.1 Category rules (`categoryRules.ts`)

**Working logic (unchanged):**

| Classification | Behavior |
|----------------|----------|
| **Direct** (`DIRECT_LISTING_CATEGORIES`) | Can be publicly listed on Explore (subject to other filters). |
| **Request-first** (`REQUEST_FIRST_CATEGORIES`) | Not the primary public-list path; demand driven via requests / messaging. |
| **Approval-required** (`APPROVAL_REQUIRED_CATEGORIES`) | High-trust categories may need moderation before going live. |
| **Restricted** (`RESTRICTED_CATEGORIES`) | Blocked (currently empty list in code). |

Helpers: `getCategoryListingType`, `isDirectListingAllowed`, `isRequestFirstAllowed`, etc.

### 6.2 Listing document (`Listing` interface)

Notable fields: `ownerId`, pricing (`rentPerDay`, `price.*`), `swapAllowed`, `category`, `location` (`GeoPoint`), `images[]`, `city`, `available`, `moderation`, `listingType`, `requestEnabled`, `likes`, `comments`, `softDeleted`.

**Itemile:** USD pricing inputs; US city names on listing form.

---

## 7. Identity verification (US adaptation)

### 7.1 Policy (replaces India KYC)

| Lendlly (India) | Itemile (US) |
|-----------------|--------------|
| `aadharFront`, `aadharBack`, `pan`, `selfie` | `driversLicenseFront`, `driversLicenseBack`, `selfie` (minimum) |
| Default required: Aadhaar + PAN | Default required: Driver's license front + back + selfie |
| Labels: Aadhaar, PAN | Labels: Driver's license, selfie |
| Optional future: Stripe Identity, Persona, or ID.me | |

- **`kycExempt === true`:** User passes verification gates without approved KYC.
- **`kycRequiredDocKeys`:** Admin-configurable subset of required doc types.
- **`passesVerificationGate(user)`:** true if exempt or `verificationStatus === 'approved'`.

### 7.2 Flows that consult verification

Rent, pay, and post flows use `passesVerificationGate` (and UI banners) so non-exempt users must be **approved** before sensitive actions.

### 7.3 Admin identity policy (`AdminUsers` dialog)

- Admin sets **verification required** vs **exempt**.
- If required, selects mandatory document types; persists `kycExempt`, `kycRequiredDocKeys` and logs admin action.

### 7.4 Firestore / rules changes

- Update `users` KYC URL fields and `firestore.rules` allow list for KYC uploads (replace `aadharFrontUrl`, `aadharBackUrl`, `panUrl` with US field names).
- Update `verificationPolicy.ts` doc keys and labels.

---

## 8. Bookings, transactions, and payments

### 8.1 Transaction model (`Transaction`)

- Links `ownerId`, `renterId`, optional `listingId` / `requestId`.
- **Status machine** includes: `pending`, `pickup_otp_generated`, `picked_up`, `return_otp_generated`, `returned`, `completed`, `active`, `disputed`, `cancelled`, etc.
- **OTP fields** for pickup/return with expiry timestamps.
- **Financials:** `amount`, `totalRent`, `deposit`, `serviceFee`, `insuranceFee`, payment provider ids, `paymentStatus`, `paymentSplit` (marketplace split metadata).

### 8.2 Payments (US — Stripe Connect)

Replace Lendlly Razorpay integration with Stripe:

| Lendlly (Razorpay) | Itemile (Stripe) |
|--------------------|------------------|
| `createRazorpayRouteAccount` | Stripe Connect Express onboarding |
| `createRazorpayOrder` | `PaymentIntent` with application fee |
| `verifyRazorpayPayment` | Webhook `payment_intent.succeeded` |
| `refundDeposit` | Stripe Refund API |

- **Currency:** USD; amounts stored in **cents**.
- **UI:** Stripe Elements or Checkout (`PaymentDialog`, `PaymentPage`, `PaymentSuccess`).
- **Payout:** ACH via Connect (replace UPI examples in `BankDetailsDialog.tsx`).
- **Cloud Functions:** Rewrite payment functions in `functions/index.js`; remove Razorpay config.

### 8.3 Chat

- **Transaction chat:** route `/transactions/:transactionId` loads `Chat` for that booking.
- **Inbox:** `/chat` uses `ChatInbox`; queries scoped by Firestore rules to participants.
- Cloud Function on new message → email notification (Itemile-branded templates).

---

## 9. Trust, moderation, and safety

- **Trust score / flags:** `trustScore`, `flagsCount`; admin can **warn** (adjust trust via `adjustUserTrustMetrics`) and **ban** (`banned: true`, trust 0) with audit logging (`logAdminAction`).
- **Listing moderation:** `moderation.status` (`active`, `flagged`, `removed`, `pending_review`), reasons, reviewer metadata.
- **Banned users:** Actions disabled in admin UI where `user.banned`.
- **Reports:** `reports` collection; admin-only read.

---

## 10. Admin console

### 10.1 Access

- JWT custom claims: `role: 'admin' | 'moderator'` (see `useAuthRole`, `AdminRoute`).
- Firestore `users.systemRole` is related product data; route gating uses **claims**.
- Update admin email whitelist in `firestore.rules` and `adminEmails.ts` for Itemile operators.

### 10.2 Modules (under `/admin/*`)

| Module | Purpose |
|--------|---------|
| Dashboard | High-level stats / entry. |
| Users | Search, filters, referrals, trust, KYC policy, warn, ban, view listings, payout details (decrypted for admin). |
| Listings | Moderation / inventory oversight. |
| Bookings | Transaction oversight. |
| Reports | User reports / flags. |
| Settings | Configuration. |

### 10.3 Audit

- `logAdminAction` records actor, action type, target, reason, metadata (implementation in `firestore.ts`).

**Design:** New admin shell branding ("Itemile Admin Console"); same data and actions as Lendlly.

---

## 11. Notifications and email

### 11.1 In-app

- `notifications` collection; types include rental request, message, transaction update, verification approved/rejected, request match, nearby request/listing, etc.

### 11.2 Email queue

- `email_notifications` for outbound messages (Cloud Function `sendEmailNotification`).
- **Itemile updates:**
  - From: `Itemile <noreply@itemile.com>` (or configured domain)
  - Support: `support@itemile.com`
  - `APP_URL`: Itemile production URL
  - Body copy: US English, USD amounts, Itemile signature

---

## 12. Media and security

| Concern | Implementation |
|---------|----------------|
| **Images/videos** | Cloudinary — folders under `itemile/*` (listings, videos, kyc, profile-photos, chat, handoverMedia) |
| **Firebase Storage** | Initialized in Lendlly but unused; optional for Itemile or continue Cloudinary-only |
| **Payout fields** | Stored encrypted (`encryption.ts`); admin payout dialog decrypts for display |
| **Terms** | Versioned localStorage keys for terms acceptance (`itemile_terms_*`) |

**Cloudinary env:** `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` (new preset, e.g. `itemile_upload`).

---

## 13. Design system requirements (Itemile-only)

This is the main differentiation from Lendlly.

### 13.1 Brand

- **Name:** Itemile
- **Tagline:** TBD (e.g. "Rent what you need. Share what you have.")
- Logo, favicon, OG images — all new assets
- **No** "Lendlly", "Rent Share", or `lendlly.in` in UI, emails, or meta tags

### 13.2 Visual language (define in Figma before build)

| Token | Direction |
|-------|-----------|
| Primary palette | Distinct from Lendlly — do not copy their colors |
| Typography | US-friendly sans (e.g. Inter, Geist, or custom) |
| Radius / shadow | Own component style |
| Landing | New hero, social proof, how-it-works — same sections, new layout |
| Explore | New map + grid split, card design, mobile bottom sheet |
| Forms | New input/button styles (keep shadcn/Radix primitives) |

### 13.3 Component parity checklist

Every Lendlly screen gets an Itemile skin:

- **Public:** Index, ProductDetail, VendorStore, policy pages
- **Auth:** Signup, Login, ForgotPassword, GoogleAuth referral dialog
- **Core:** Explore, PostItem, PostRequest, RequestsFeed, Dashboard, Transactions, OwnerBookings
- **Comms:** Chat, ChatInbox, Notifications, Profile
- **Payments:** PaymentPage, PaymentSuccess
- **Modals:** PaymentDialog, TenureSelector, BookingCalendar, KYCVerification, BankDetailsDialog, ReviewDialog, CitySelectorDialog, LocationPermissionDialog, TermsNotification, OtpConfirmation, RenterOtpEntry
- **Admin:** AdminLayout, AdminDashboard, AdminUsers, AdminListings, AdminBookings, AdminReports, AdminSettings, AdminKYC

**Constraint:** Do not change route paths, Firestore writes, or payment/OTP state machines when reskinning.

---

## 14. Firebase and infrastructure

### 14.1 New Firebase project (recommended)

Do **not** share Lendlly's `rentshare-5c5eb` project. Create a dedicated Itemile project.

| Config file | Action |
|-------------|--------|
| `.firebaserc` | New project ID (e.g. `itemile-prod`) |
| `.env` | New `VITE_FIREBASE_*` vars |
| `firebase.json` | Deploy hosting, rules, functions |
| `firestore.rules` | Copy Lendlly rules; update admin emails + KYC field names |
| `functions/index.js` | Stripe functions, Itemile email branding |
| `public/firebase-messaging-sw.js` | Real Itemile config if enabling push |

### 14.2 Client initialization

Same pattern as Lendlly (`src/lib/firebase.ts`):

```ts
initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
```

### 14.3 Environment variables

| Variable | Purpose |
|----------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | FCM |
| `VITE_FIREBASE_APP_ID` | Web app ID |
| `VITE_FIREBASE_GOOGLE_CLIENT_ID` | Optional Google OAuth override |
| `VITE_GOOGLE_MAPS_API_KEY` | Maps/geocoding (US region bias) |
| `VITE_CLOUDINARY_CLOUD_NAME` | Media uploads |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Upload preset |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe checkout |
| `VITE_ENCRYPTION_KEY` | Bank detail encryption |

**Functions:** `EMAIL_USER`, `EMAIL_PASSWORD`, `APP_URL`, Stripe secret keys.

---

## 15. Firestore data model (same schema as Lendlly)

### 15.1 Top-level collections

| Collection | Purpose |
|------------|---------|
| `users` | Profiles, KYC URLs, wallet, referrals, trust, access flags |
| `referralCodes` | Code → `uid` lookup |
| `accessCodes` | Waitlist access codes |
| `listings` | Rental listings |
| `transactions` | Bookings / rentals |
| `chats` | Chat threads |
| `notifications` | In-app notifications |
| `email_notifications` | Email queue |
| `reviews` | User reviews |
| `requests` | "Need an item" requests feed |
| `reports` | User reports (admin) |
| `admin_actions` | Admin audit log |
| `messagePosts` | Community posts on Explore |

### 15.2 Subcollections

| Path | Purpose |
|------|---------|
| `transactions/{transactionId}/messages` | Legacy transaction-scoped messages |
| `transactions/{transactionId}/handoverMedia` | Pickup/return proof metadata |
| `chats/{chatId}/messages` | Primary chat messages |

---

## 16. Lendlly → Itemile migration checklist

### 16.1 Must change

| Area | Lendlly | Itemile |
|------|---------|---------|
| Firebase project | `rentshare-5c5eb` | New project |
| Brand / domain | `lendlly.in` | `itemile.com` (or chosen domain) |
| Currency | INR / ₹ | USD / $ |
| Payments | Razorpay | Stripe Connect |
| KYC docs | Aadhaar + PAN | US driver's license + selfie |
| Phone | `+91`, 10-digit | `+1`, US validation |
| Cities | Indian metros | US metros |
| Cloudinary folders | `rent-share/*` | `itemile/*` |
| localStorage keys | `lendlly_selected_city` | `itemile_selected_city` |
| Email | `support@lendlly.in` | `support@itemile.com` |
| Admin UI title | "RentShare Admin Console" | "Itemile Admin Console" |

### 16.2 Keep unchanged (logic parity)

- Route map (`App.tsx`)
- `firestore.ts` data flows (referrals, transactions, OTP, chat, notifications)
- `categoryRules.ts`
- `ProtectedRoute.tsx`, `GoogleAuth.tsx` referral dialog
- `applyExploreLocationFilter` behavior
- Admin modules and audit logging

### 16.3 Key files to touch

**Branding / design:** `index.html`, `Index.tsx`, `Header.tsx`, `tailwind.config.ts`, all policy pages, `TermsNotification.tsx`, email templates in `firestore.ts` and `functions/index.js`, `sitemap.xml`, `robots.txt`

**Region / compliance:** `verificationPolicy.ts`, `KYCVerification.tsx`, `AdminKYC.tsx`, `Signup.tsx`, `ForgotPassword.tsx`, `CitySelectorDialog.tsx`, `Explore.tsx`, payment components, `razorpay.ts` → `stripe.ts`, `functions/index.js`

**Infra:** `.env`, `.firebaserc`, `firestore.rules`, `firebase-messaging-sw.js`, `scripts/set-admin-role.js`

---

## 17. Non-functional requirements

| Area | Itemile target |
|------|----------------|
| Hosting | Static SPA (Vite build); Firebase Hosting or Vercel |
| Auth persistence | Firebase Auth session; `onAuthStateChanged` across app |
| Rules | `firestore.rules` — users update own profile except admin-only verification fields |
| Performance | Listings fetched in bulk; client-side filter/sort/pagination on Explore |
| Maps | `VITE_GOOGLE_MAPS_API_KEY`; US region bias |
| SEO | Itemile domain sitemap, robots, OG tags |
| Analytics | New GA4 / PostHog property |
| Accessibility | WCAG 2.1 AA on new components |

---

## 18. Implementation phases

### Phase 1 — Foundation
- New Firebase project + env
- Fork repo → `itemile-web`
- Design system + Header/Footer/Layout
- Rebrand auth pages

### Phase 2 — Core marketplace
- Explore, ProductDetail, PostItem (US cities, USD)
- Category rules unchanged
- Cloudinary `itemile/*` folders

### Phase 3 — Transactions
- Stripe Connect + PaymentIntent flow
- OTP handover flows (copy logic)
- Chat + notifications

### Phase 4 — Trust & admin
- US identity verification UI + rules
- Admin console reskin
- Email templates

### Phase 5 — Launch
- US legal pages
- Production deploy, admin claims, smoke tests
- Optional: wire `AccessCodeDialog` for invite-only launch

---

## 19. Acceptance criteria (feature parity)

| # | Criterion |
|---|-----------|
| 1 | User can sign up/login with email or Google and receive referral code |
| 2 | New Google user sees referral dialog when eligible |
| 3 | User can browse Explore with city filter and map |
| 4 | User can list item with images (Cloudinary) and category rules enforced |
| 5 | Non-exempt user cannot rent/post until identity approved |
| 6 | Renter can book, pay in USD via Stripe, and complete pickup/return OTP |
| 7 | Owner receives payout via Connect |
| 8 | Chat works per transaction and in inbox |
| 9 | Notifications and emails fire on key events |
| 10 | Admin can moderate users, listings, bookings, reports |
| 11 | No Lendlly branding visible anywhere in Itemile build |

---

## 20. Known product behaviors (preserve from Lendlly)

1. **Explore + Current Location:** Grid shows **all** listings that pass city/search filters; map pin reflects GPS/manual location.
2. **New Google user + referral:** Dialog shows once per new account if no referrer attached and no code was passed from signup form.
3. **Referral code after signup:** `applyReferralCodeIfEligible` cannot override an existing `referredByUid`.
4. **Admin route:** Driven by **JWT claims**, not only Firestore `systemRole` — claims must be set in Firebase for admin users.
5. **Access codes:** `accessCodes` collection and `AccessCodeDialog` exist in Lendlly but dialog is not mounted — decide for Itemile launch.

---

## 21. Optional US product decisions (post-v1)

1. **Sales tax** — varies by state; consider TaxJar, Avalara, or Stripe Tax.
2. **Insurance** — `insuranceFee` exists on transactions; US rental insurance partner.
3. **Shipping** — Lendlly is local handoff only; Itemile may add shipping for some categories.
4. **Age verification** — stricter gates for vehicles and restricted categories.
5. **Apple Sign-In** — common expectation on iOS.

---

## 22. Document maintenance

- **Behavior source of truth:** Lendlly code (`firestore.ts`, `Explore.tsx`, `GoogleAuth.tsx`, `AdminUsers.tsx`, `ProtectedRoute.tsx`, `categoryRules.ts`, `verificationPolicy.ts`) and `PRD.md`.
- **Itemile source of truth:** This document + Itemile design spec (Figma).
- Update when adding routes, changing `applyExploreLocationFilter`, referral flows, transaction status semantics, or US compliance requirements.

---

*End of Itemile PRD.*
