# User Review System - Implementation Guide

## Overview
The User Review System allows users to rate and review each other after completed transactions. This helps build trust and transparency in the rental sharing community.

## Features Implemented

### 1. **Review Dialog Component** (`src/components/ReviewDialog.tsx`)
- Interactive star rating (1-5 stars)
- Text comment field (10-500 characters)
- Support for creating new reviews and updating existing reviews
- Validation to ensure quality reviews
- Visual feedback with star rating descriptions (Poor, Fair, Good, Very Good, Excellent)

### 2. **Profile Reviews Tab** (`src/pages/Profile.tsx`)
- New "Reviews" tab in user profile
- Displays all reviews received by the user
- Shows reviewer information (name, photo, rating, comment)
- Displays transaction details associated with each review
- Updates user rating count in real-time

### 3. **Transaction Review Integration** (`src/pages/Transactions.tsx`)
- "Review" button appears for completed transactions
- Only shows review button if:
  - Transaction is completed
  - User hasn't already reviewed the other party
- Review button appears for both owners and renters
- Automatically refreshes after review submission

### 4. **Firestore Functions** (`src/lib/firestore.ts`)
The following review functions are available:

- **`createReview()`** - Creates a new review
- **`getReviewsByUser()`** - Fetches all reviews for a specific user
- **`getReviewByTransaction()`** - Checks if a review exists for a transaction
- **`updateReview()`** - Updates an existing review
- **`deleteReview()`** - Deletes a review
- **`updateUserRating()`** - Automatically recalculates user's average rating
- **`canUserReview()`** - Checks if a user is eligible to review a transaction

## Database Structure

### Reviews Collection (`reviews/{reviewId}`)
```typescript
{
  id: string;
  reviewerId: string;           // User who wrote the review
  reviewerName: string;          // Name of reviewer
  reviewerPhotoUrl?: string;     // Profile photo of reviewer
  revieweeId: string;            // User being reviewed
  transactionId: string;         // Associated transaction
  listingId: string;             // Associated listing
  listingTitle: string;          // Title of the rented item
  rating: number;                // 1-5 stars
  comment: string;               // Review text
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

## Firestore Security Rules

```javascript
// Reviews: users can create reviews for completed transactions they participated in
match /reviews/{reviewId} {
  // Anyone can read reviews
  allow read: if request.auth != null;
  
  // Can create review if user is part of the transaction and it's completed
  allow create: if request.auth != null &&
    request.auth.uid == request.resource.data.reviewerId;
  
  // Can update/delete own reviews
  allow update, delete: if request.auth != null &&
    request.auth.uid == resource.data.reviewerId;
}
```

## User Flow

### For Renters:
1. Complete a transaction by renting an item
2. After transaction is marked as "completed", a "Review" button appears
3. Click "Review" to open the review dialog
4. Rate the owner (1-5 stars) and write a comment
5. Submit the review
6. Review appears on the owner's profile

### For Owners:
1. Complete a transaction by renting out an item
2. After transaction is marked as "completed", a "Review" button appears
3. Click "Review" to open the review dialog
4. Rate the renter (1-5 stars) and write a comment
5. Submit the review
6. Review appears on the renter's profile

## Rating Calculation

- User ratings are automatically calculated as the average of all reviews
- Ratings are rounded to 1 decimal place
- Rating updates immediately after a new review is submitted
- If all reviews are deleted, rating returns to 0

## Key Features

### 1. **Prevents Duplicate Reviews**
- Users can only review each transaction once
- Existing reviews can be edited/updated
- The system checks eligibility before showing the review button

### 2. **Two-Way Reviews**
- Both parties (owner and renter) can review each other
- Reviews are independent - one person's review doesn't affect the other's ability to review

### 3. **Transaction-Based**
- Reviews are tied to specific transactions
- Shows the item that was rented in the review
- Provides context for the review

### 4. **Automatic Rating Updates**
- User's overall rating updates automatically when reviews are added/edited/deleted
- No manual intervention required

### 5. **Rich Display**
- Shows reviewer's profile photo and name
- Displays star rating visually
- Includes transaction details
- Formatted timestamps

## Usage Examples

### Check if User Can Review:
```typescript
const canReview = await canUserReview(transactionId, userId);
if (canReview) {
  // Show review button
}
```

### Create a Review:
```typescript
await createReview({
  reviewerId: currentUserId,
  reviewerName: currentUserName,
  reviewerPhotoUrl: currentUserPhoto,
  revieweeId: otherUserId,
  transactionId: transaction.id,
  listingId: listing.id,
  listingTitle: listing.title,
  rating: 5,
  comment: "Great experience! Highly recommended."
});
```

### Get User's Reviews:
```typescript
const reviews = await getReviewsByUser(userId);
```

## Future Enhancements

Potential improvements for the review system:

1. **Review Response** - Allow users to respond to reviews they receive
2. **Review Moderation** - Flag inappropriate reviews for admin review
3. **Review Filtering** - Filter reviews by rating (e.g., show only 5-star reviews)
4. **Review Statistics** - Show breakdown of ratings (X 5-star, Y 4-star, etc.)
5. **Verified Reviews** - Badge for reviews from verified transactions
6. **Review Photos** - Allow users to attach photos to reviews
7. **Helpful Votes** - Let users mark reviews as helpful
8. **Review Reminders** - Send notifications to review after completing transactions

## Testing Checklist

- [ ] User can submit a review after completing a transaction
- [ ] Review appears on the reviewed user's profile
- [ ] User's average rating updates correctly
- [ ] Users cannot review the same transaction twice
- [ ] Review button only shows for completed transactions
- [ ] Both owner and renter can review each other
- [ ] Existing reviews can be edited
- [ ] Reviews display correctly with all information
- [ ] Star ratings display visually
- [ ] Review comments are properly validated (min 10 characters)

## Troubleshooting

### Reviews Not Showing
- Check that Firestore rules include review permissions
- Verify the transaction status is "completed"
- Ensure the user is part of the transaction

### Rating Not Updating
- Check that `updateUserRating()` is being called after review operations
- Verify the reviews collection is being queried correctly
- Check for any console errors in the browser

### Review Button Not Appearing
- Verify transaction status is "completed"
- Check that `canUserReview()` is returning true
- Ensure the review check is being performed after fetching transactions

---

## Update Log

### Update 1 (Initial Implementation)
- Created ReviewDialog component with star rating and comment functionality
- Added Reviews tab to Profile page displaying all user reviews
- Integrated review system into Transactions page for completed transactions
- Implemented all necessary Firestore functions for review management
- Updated Firestore security rules to support reviews collection
- Added automatic user rating calculation and updates
- Documented complete review system implementation

