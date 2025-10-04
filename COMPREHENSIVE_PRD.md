# Rent Share — Comprehensive Product Requirements Document

**Version:** 1.0.0 | **Date:** September 30, 2025 | **Type:** Peer-to-Peer Rental & Swap Platform

---

## Executive Summary

**Vision:** A location-based marketplace enabling users to rent or swap items within their community, promoting sustainability and resource sharing.

**Tech Stack:** React 18 + TypeScript + Vite + Firebase + Cloudinary + Google Maps

**Status:** Production-ready web application with complete feature set documented below.

---

## Complete Feature Inventory (As-Implemented)

### ✅ Authentication & User Management
- Email/Password signup and login
- Google OAuth integration (one-click authentication)
- Forgot password with email reset
- Role-based onboarding flow (Rent | Swap | Both)
- Profile photo upload via Cloudinary (< 5MB validation)
- Profile editing (name, email, phone)
- Real-time auth state management
- Session persistence
- Logout with confirmation

### ✅ Listing Management (CRUD)
- **Create:** Multi-step form with validation
- **Read:** View all listings, own listings, item details
- **Update:** Edit title, description, price, category via dialog
- **Delete:** With confirmation prompt
- Multi-image upload (up to 8 photos) with preview
- 360° video proof upload (optional, recommended < 100MB)
- GPS "Get Current Location" button for auto-fill lat/lng
- Manual lat/lng coordinate entry
- Category dropdown (10 categories: Photography, Sports, Electronics, Tools, Gaming, Music, Kitchen, Furniture, Books, Clothing)
- Daily rental rate in ₹ (Indian Rupee)
- Swap allowed toggle
- Availability status management
- Features & specifications tagging
- Rental policies customization
- Image/video preview before upload
- Cloudinary media storage

### ✅ Discovery & Search
- **Google Maps Integration:**
  - Interactive map with custom markers
  - Marker clustering for overlapping items
  - Marker click → InfoWindow pop-up with item preview
  - Marker hover highlights list card (desktop)
  - User location button with GPS access
  - Fallback to default coordinates if GPS denied
  - Recenter to user location
- **Sidebar List View:**
  - Real-time search by title/category
  - Filter by category (dropdown)
  - Filter by price range (min/max sliders)
  - Swap-only checkbox filter
  - Item count display
  - Synchronized with map (bi-directional)
- **Mobile:** Bottom sheet for selected items
- **Empty/Loading States:** Skeleton loaders, "No items found" messages

### ✅ Item Detail Page
- **Media Gallery:**
  - Image carousel with prev/next navigation
  - Thumbnail strip for quick switching
  - Full-screen image viewer
  - 360° video player (HTML5, controls, preload metadata)
- **Owner Info:**
  - Avatar (profile photo or initials)
  - Name, rating display
  - "Contact Owner" button → creates/opens chat
- **Pricing:**
  - Daily rate display
  - Service fee breakdown (₹5)
  - Total calculation
- **Location:**
  - City name (reverse geocoded via Google Geocoding API)
  - GPS coordinates
  - "Get Directions" button → opens Google Maps
- **Actions:**
  - Calendar date picker for rental period
  - "Request to Rent" button (primary CTA)
  - "Propose a Swap" button (conditional on swapAllowed)
  - Like/favorite button (heart icon)
  - Share button (Web Share API + clipboard fallback)
- **Details:**
  - Category badge
  - Swap availability badge
  - Features & Specifications list
  - Description card
  - Rental Policies card
- **Validations:**
  - Cannot rent/swap own item
  - Date selection required for rent
  - Swap button disabled if not allowed

### ✅ Transactions & Workflow
- **Transaction Dashboard:**
  - 4 tabs: Active (pending/active), History (completed), Swaps (type=swap), Map (live map)
  - Transaction cards with rich details (image, title, type, status, participants, dates, amount)
  - Status badges (color-coded: pending=yellow, active=blue, completed=green, disputed=red)
- **Owner Actions:**
  - Accept button (pending → active)
  - Decline button (pending → declined)
  - Mark Complete button
- **Renter Actions:**
  - Chat button
  - Cancel Request button (pending only)
  - Mark Complete button (when active)
- **Auto-Creation:**
  - Request Rent → creates transaction + chat
  - Propose Swap → creates transaction (type=swap) + chat
  - Notifications sent to owner
- **Navigation:**
  - Click transaction card → open linked chat
- **Map Tab:**
  - Full-height live map
  - Floating items panel with "Update Location" button
  - Item cards with View CTA

### ✅ Messaging & Chat
- **Chat Inbox (`/chat`):**
  - Split layout: Chat List (left) + Chat Area (right)
  - Search conversations
  - Sorted by lastUpdated (newest first)
  - Chat preview: avatar, name, listing title, last message, timestamp
  - Active chat highlight
- **Real-Time Messaging:**
  - Firestore onSnapshot listeners
  - Message list (own messages right/blue, other left/gray)
  - Timestamp formatting (relative: "2m ago", "Yesterday", "Sep 28")
  - Auto-scroll to latest message
  - Message input with Enter key submit
  - Send button (disabled when empty)
- **Transaction-Based Chat:**
  - Linked to specific rental/swap
  - Participant validation (owner + renter only)
  - Chat metadata (listing title, transaction ID)
- **Empty States:**
  - "No conversations yet"
  - "Select a conversation"

### ✅ Notifications
- **Real-Time System:**
  - Firestore onSnapshot for unread count
  - Badge in header (bell icon with count)
  - Notification types: rental_request, swap_proposal, message, transaction_update
- **Notification Page:**
  - List sorted by newest
  - Icon per type (color-coded)
  - Timestamp display
  - "New" badge for unread
  - Individual "Mark as Read" button
  - "Mark All as Read" button
  - Empty state: "No notifications yet"
- **Triggers:**
  - New rental request
  - New swap proposal
  - Transaction status change (accepted, declined, completed)
  - Chat messages (future)

### ✅ Profile & Account Management
- **Profile Page (`/profile`):**
  - 6 tabs: User Info, My Rentals, Saved Rentals, Payments, Settings, Help & Support
  - Large avatar with camera icon for photo upload
  - Name, email, rating display
  - Edit Profile dialog (name, email, phone)
  - Logout button
- **User Info Tab:**
  - Personal Information card (email, phone, join date, wallet balance)
  - Account Status card (verification badge, rating, listing count, saved count)
- **My Rentals Tab:**
  - Grid of owned listings
  - Each card: image, title, description snippet, price, category
  - Actions: View, Edit, Delete
  - Edit dialog (title, description, rentPerDay, category)
  - Delete confirmation prompt
  - Empty state: "No listings yet" + Post Item CTA
- **Saved Rentals Tab:**
  - Placeholder: "Items you save will appear here"
  - Empty state with Explore CTA
- **Payments Tab:**
  - "Payments Coming Soon" placeholder
  - Feature bullets (secure processing, transaction history, refunds, etc.)
- **Settings Tab:**
  - Account Settings buttons
  - Account Actions (Change Password, Download Data, Delete Account, Logout)
- **Help & Support Tab:**
  - Contact Support card (email: rentshare11@gmail.com, phone: +91 8547652100)
  - FAQ card (4 questions)

### ✅ Dashboard (Seller Overview)
- **Stats Cards:**
  - Total Earnings (₹)
  - Active Listings (#)
  - Average Rating (⭐)
  - Total Bookings (#)
- **Tabs:**
  - Overview: Recent Activity + Top Performing Items
  - My Listings: List with View/Edit/Delete
  - Bookings: Requests with Accept/Decline
  - Profile: Quick access to profile info
- **Note:** Currently uses mock data; needs Firestore integration

### ✅ Header & Navigation
- **Sticky Header:**
  - Glassmorphism effect
  - Logo with gradient branding
  - Search bar (desktop/mobile)
  - Navigation: Explore, Transactions, Chat, Profile
  - "Post Item" button (logged-in users)
  - Notification bell with count badge
  - User avatar dropdown menu
  - Mobile hamburger menu
- **Dropdown Menu:**
  - Profile, Messages, Dashboard, Logout
- **Auth States:**
  - Logged-in: Full nav + Post button + notifications
  - Logged-out: Sign In, Sign Up buttons

### ✅ Landing Page (`/`)
- **Sections:**
  1. Hero with value proposition + CTA buttons (Start Exploring, List Your Item)
  2. Feature showcase (4 cards: Location-Based, Secure, Flexible, Community)
  3. Category grid (4 categories with icons, item counts)
  4. Swap examples (3 examples with savings badges)
  5. "How Smart Swapping Works" (3-step guide)
  6. Platform statistics (10k users, 50k items, ₹2M transactions)
  7. User testimonials (3 with star ratings)
  8. CTA section (Get Started Free, Browse Items)
  9. Footer (branding, contact info, quick links)
- **Visual Design:**
  - Floating animated background elements (12 icons)
  - Glassmorphism cards
  - Gradient text effects
  - Hover scale animations
  - Responsive grid layouts

### ✅ Onboarding Flow
- **Role Selection:**
  - 3 cards: Rent Items, Swap Items, Rent & Swap
  - Click to select (ring highlight)
  - Feature bullets per role
  - "Continue" button saves role to Firestore
  - Redirects to `/explore`

### ✅ Auth Pages
- **Login (`/login`):**
  - Email/password inputs
  - "Sign in" button
  - "Continue with Google" button
  - "Forgot password?" link
  - "Sign up" link
- **Signup (`/signup`):**
  - Name, email, password, confirm password inputs
  - "Sign up" button
  - "Continue with Google" button
  - Password match validation
  - Auto-create Firestore user doc
  - Redirect to onboarding
- **Forgot Password (`/forgot-password`):**
  - Email input
  - "Send reset email" button
  - Success message
  - Back to login link

### ✅ 404 Not Found
- "Page not found" message
- "Back to home" button

---

## Technical Architecture

### Frontend
- **Framework:** React 18.3.1
- **Language:** TypeScript 5.5.3
- **Build:** Vite 5.4.1
- **Routing:** React Router DOM 6.26.2
- **UI:** shadcn/ui (Radix UI + Tailwind CSS 3.4.11)
- **Icons:** Lucide React 0.462.0
- **Forms:** React Hook Form 7.53.0 + Zod 3.23.8
- **State:** React Hooks + TanStack React Query 5.56.2
- **Toast:** Sonner 1.5.0

### Backend & Services
- **Auth:** Firebase Auth (Email/Password, Google OAuth)
- **Database:** Cloud Firestore
- **Storage:** Cloudinary (images, videos)
- **Maps:** Google Maps JavaScript API + Geocoding API
- **Hosting:** Vercel (or Firebase Hosting)

### Dev Tools
- ESLint 9.9.0
- TypeScript (strict mode)
- PostCSS + Autoprefixer

---

## Data Models (Firestore)

### Users (`users/{uid}`)
```typescript
{
  uid: string;
  name: string;
  email: string;
  phone: string;
  verified: boolean;
  wallet: number;
  rating: number;
  role?: 'rent' | 'swap' | 'both';
  location?: { latitude: number; longitude: number };
  idProofUrl?: string;
  profilePhotoUrl?: string;
  createdAt: Timestamp;
}
```

### Listings (`listings/{id}`)
```typescript
{
  id: string;
  ownerId: string;
  title: string;
  description: string;
  rentPerDay: number;
  swapAllowed: boolean;
  category: string;
  location: GeoPoint;
  images: string[];
  videoProof?: string;
  available: boolean;
  createdAt: Timestamp;
}
```

### Transactions (`transactions/{id}`)
```typescript
{
  id: string;
  transactionId?: string;
  listingId?: string;
  listingTitle?: string;
  ownerId: string;
  renterId: string;
  participants: [ownerId, renterId];
  type: 'rent' | 'swap';
  status: 'pending' | 'active' | 'completed' | 'disputed';
  startDate: Timestamp;
  endDate: Timestamp;
  amount: number;
  paymentMode: 'online' | 'offline';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Chats (`chats/{chatId}`)
```typescript
{
  id: string;
  chatId: string;
  participants: [uid1, uid2];
  transactionId?: string;
  listingId?: string;
  listingTitle?: string;
  lastMessage: string;
  lastUpdated: Timestamp;
}
// Subcollection: messages/{messageId}
{
  senderId: string;
  text: string;
  createdAt: Timestamp;
}
```

### Notifications (`notifications/{id}`)
```typescript
{
  id: string;
  userId: string;
  type: 'rental_request' | 'swap_proposal' | 'message' | 'transaction_update';
  transactionId?: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
}
```

---

## Key User Flows

### 1. Sign Up & Onboard
User → Signup page → Enter details OR Google OAuth → Account created → Onboarding screen → Select role → Explore page

### 2. Create Listing
User → Post Item → Fill form (title, description, category, price, location, images, video) → Click "Get Current Location" → Upload media → Publish → Redirected to Dashboard

### 3. Browse & Request Rental
User → Explore → Filter/search items → Click marker/card → Item Detail → Select date → "Request to Rent" → Transaction + Chat created → Navigated to Chat

### 4. Owner Accept Request
Owner → Notifications (new request) → Transactions page → Click "Accept" → Status=active → Renter notified → Chat active

### 5. Complete Transaction
Owner OR Renter → Transactions → Active tab → "Mark Complete" → Status=completed → Moved to History

### 6. Propose Swap
User → Item Detail (swapAllowed=true) → "Propose a Swap" → Transaction (type=swap) + Chat created → Owner notified

### 7. Real-Time Chat
User → Chat Inbox → Select conversation → Type message → Send → Real-time delivery to other user

### 8. Edit/Delete Listing
Owner → Profile → My Rentals → Edit (dialog) → Save → Updated in Explore | Delete (confirmation) → Removed from Firestore

---

## Integrations

### Firebase
- **Auth:** Email/Password, Google OAuth
- **Firestore:** Real-time database with security rules
- **Functions:** `createUser`, `createListing`, `createTransactionAndChat`, `sendChatMessage`, etc.

### Cloudinary
- **Upload:** `uploadToCloudinary(file, folder)`, `uploadMultipleImages(files, folder)`
- **Folders:** `rent-share/listings`, `rent-share/videos`, `rent-share/profile-photos`

### Google Maps
- **Components:** `LiveMap`, `GoogleMap`, `TransactionMap`
- **Features:** Markers, clustering, InfoWindows, directions
- **Geocoding:** `getCityNameFromCoordinates(lat, lng)` via Geocoding API

---

## Non-Functional Requirements

- **Performance:** Page load < 3s, Map render < 5s, Chat < 1s
- **Scalability:** 10,000+ concurrent users via Firebase
- **Security:** Firebase Auth, Firestore rules, HTTPS
- **Accessibility:** WCAG AA, keyboard nav, screen reader support
- **Responsive:** Mobile-first (< 768px), Tablet (768-1024px), Desktop (> 1024px)
- **Browser:** Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Media:** Images < 5MB (validated), Video < 100MB (recommended)

---

## Environment Variables

```env
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
VITE_GOOGLE_MAPS_API_KEY
VITE_CLOUDINARY_CLOUD_NAME
VITE_CLOUDINARY_UPLOAD_PRESET
```

---

## Future Roadmap

### Phase 2 (Q1 2026)
- Razorpay/Stripe payment integration
- Escrow system
- Ratings & reviews
- Advanced search (Algolia)
- Distance radius filter

### Phase 3 (Q2 2026)
- Admin dashboard
- Native mobile apps (React Native)
- Push notifications
- Multi-language support
- Delivery coordination
- Insurance integration

---

## Success Metrics
- DAU/MAU
- Transaction volume
- Conversion rate (browse → transaction)
- Repeat usage rate
- Platform GMV

---

**Document Owner:** Product & Engineering  
**Last Updated:** September 30, 2025  
**Next Review:** October 2025
