# Rent Share MVP - Setup Instructions

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Google Maps API Key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset_name
```

## Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication with Email/Password and Google providers
3. Create a Firestore database
4. Set up the following Firestore collections:

### Collections Structure

**users/{uid}**
- name (string)
- email (string)
- phone (string)
- verified (boolean)
- wallet (number)
- rating (number)
- createdAt (timestamp)
- role (string) - "rent" | "swap" | "both"
- idProofUrl (string) - optional

**listings/{listingId}**
- ownerId (string)
- title (string)
- description (string)
- rentPerDay (number)
- swapAllowed (boolean)
- category (string)
- location (geopoint)
- images (array of strings)
- videoProof (string) - optional
- available (boolean)
- createdAt (timestamp)

**transactions/{transactionId}**
- itemId (string)
- ownerId (string)
- renterId (string)
- type (string) - "rent" | "swap"
- status (string) - "pending" | "active" | "completed" | "disputed"
- startDate (timestamp)
- endDate (timestamp)
- amount (number)
- paymentMode (string) - "online" | "offline"
- createdAt (timestamp)

**transactions/{transactionId}/messages/{messageId}**
- senderId (string)
- text (string)
- createdAt (timestamp)

**reviews/{reviewId}**
- reviewerId (string)
- reviewerName (string)
- reviewerPhotoUrl (string) - optional
- revieweeId (string)
- transactionId (string)
- listingId (string)
- listingTitle (string)
- rating (number) - 1-5 stars
- comment (string)
- createdAt (timestamp)
- updatedAt (timestamp) - optional

## Google Maps Setup

1. Go to Google Cloud Console
2. Enable Maps JavaScript API
3. Create an API key
4. Add the API key to your environment variables

## Cloudinary Setup

1. Create a Cloudinary account
2. Create an unsigned upload preset
3. Add your cloud name and upload preset to environment variables

## Features Implemented

✅ **Map Integration (Google Maps)**
- Fetch listings from Firestore
- Display pins on map with popup cards
- Floating filters (category, price range, swap only)

✅ **Add Listing Page**
- Image and video upload to Cloudinary
- Save to Firestore with proper schema
- Location coordinates input

✅ **Transactions Page**
- Fetch user transactions (owner/renter)
- Tabs: Active | History | Swaps
- Status management (accept/decline/complete)

✅ **Chat Page**
- Real-time messaging with Firestore
- Transaction context display
- Message bubbles (sender/receiver)

✅ **Google OAuth**
- Firebase Authentication integration
- User creation in Firestore
- Onboarding flow

✅ **Enhanced Authentication**
- Email/password login
- Google OAuth
- User registration with Firestore

## Running the Application

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (see above)

3. Start the development server:
```bash
npm run dev
```

## Next Steps

The following features are ready for backend integration:
- All Firestore collections are properly structured
- Cloudinary uploads are configured
- Google Maps integration is complete
- Real-time chat functionality
- Transaction management system

You can now connect your Firebase backend and start testing the full functionality!
