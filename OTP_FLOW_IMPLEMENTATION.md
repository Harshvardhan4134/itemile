# OTP Flow Implementation for Pickup and Return

## Overview
This document describes the implementation of the OTP (One-Time Password) flow for item pickup and return in the Lendlly rental platform. This system ensures secure handover verification and provides evidence for dispute resolution.

## Features Implemented

### 1. Booking Status Flow
The booking status now follows this progression:
- `pending` → `pickup_otp_generated` → `picked_up` → `return_otp_generated` → `returned` → `completed`

### 2. OTP Generation
- **Pickup OTP**: Generated automatically after payment is confirmed (6-digit code, valid for 24 hours)
- **Return OTP**: Generated automatically 1 day before rental period ends (6-digit code, valid for 7 days)
- OTPs are stored in Firestore and sent via email to both parties

### 3. Handover Media
- Owners can upload photos/videos during pickup and return confirmation
- Media is stored in Cloudinary under `handoverMedia/{bookingId}/`
- Media references are stored in Firestore subcollection: `transactions/{bookingId}/handoverMedia/{mediaId}`
- **Admin-only access**: Only admins can view handover media for dispute resolution

### 4. Email Notifications
Cloud Functions automatically send emails when:
- Pickup OTP is generated (to renter and owner)
- Return OTP is generated (to renter and owner)
- Pickup is confirmed
- Return is confirmed

## Files Modified/Created

### Backend (Firestore)
- `src/lib/firestore.ts`:
  - Updated `Transaction` interface with OTP fields
  - Added `generatePickupOtp()`, `generateReturnOtp()`
  - Added `confirmPickupOtp()`, `confirmReturnOtp()`
  - Added `uploadHandoverMedia()`, `getHandoverMedia()`
  - Added `getAllTransactions()` for admin

### Security Rules
- `firestore.rules`:
  - Added rules for `handoverMedia` subcollection
  - Admin-only read access
  - Participants can upload media

### UI Components
- `src/components/OtpDisplay.tsx`: Displays OTP to renter with copy functionality
- `src/components/OtpConfirmation.tsx`: Owner interface to confirm pickup/return with OTP and media upload
- `src/components/BookingDetail.tsx`: Complete booking detail view with OTP flows

### Pages
- `src/pages/ProductDetail.tsx`: Updated to generate pickup OTP after payment
- `src/pages/OwnerBookings.tsx`: Added BookingDetail dialog integration
- `src/pages/admin/AdminBookings.tsx`: New admin page to view all bookings and handover media

### Cloud Functions
- `functions/index.js`:
  - `onPickupOtpGenerated`: Sends emails when pickup OTP is created
  - `onReturnOtpGenerated`: Sends emails when return OTP is created

## User Flow

### For Renters:
1. After booking and payment, receive pickup OTP via email
2. View pickup OTP on booking detail page
3. Show OTP to owner when collecting item
4. When rental period ends, receive return OTP via email
5. Share return OTP with owner when returning item

### For Owners:
1. Receive notification when booking is confirmed
2. When renter arrives, ask for pickup OTP
3. Enter OTP in confirmation form
4. Optionally upload photos/videos of item condition
5. Confirm pickup - rental period starts
6. Before rental ends, receive return OTP
7. When renter returns, ask for return OTP
8. Enter OTP and upload photos/videos
9. Confirm return - booking completed

### For Admins:
1. Access Admin > Bookings page
2. View all bookings with status and media indicators
3. Click "View Handover Media" to see pickup and return photos/videos
4. Use media for dispute resolution

## Data Model

### Transaction Fields Added:
```typescript
{
  status: 'pending' | 'pickup_otp_generated' | 'picked_up' | 'return_otp_generated' | 'returned' | 'completed' | ...
  pickupOtp?: string;
  pickupOtpExpiresAt?: Timestamp;
  pickupConfirmedAt?: Timestamp;
  returnOtp?: string;
  returnOtpExpiresAt?: Timestamp;
  returnConfirmedAt?: Timestamp;
  hasPickupMedia?: boolean;
  hasReturnMedia?: boolean;
}
```

### HandoverMedia Document:
```typescript
{
  id: string;
  stage: 'pickup' | 'return';
  type: 'image' | 'video';
  url: string; // Cloudinary URL
  uploadedBy: string; // userId
  createdAt: Timestamp;
}
```

## Security Considerations

1. **OTP Storage**: OTPs are stored in plain text in Firestore. For production, consider hashing OTPs.
2. **Media Access**: Handover media is admin-only to protect user privacy and provide evidence for disputes.
3. **OTP Validation**: OTPs are validated server-side with expiration checks.
4. **Permission Checks**: Only owners can confirm pickup/return, and only participants can upload media.

## Future Enhancements

1. **OTP Hashing**: Hash OTPs before storing for additional security
2. **SMS Notifications**: Send OTPs via SMS in addition to email
3. **QR Code OTPs**: Generate QR codes for easier OTP sharing
4. **Automatic Return OTP**: Generate return OTP based on rental end date automatically
5. **Media Compression**: Compress images/videos before upload
6. **Dispute Integration**: Link handover media directly to dispute resolution workflow

## Testing Checklist

- [ ] Pickup OTP generated after payment
- [ ] Email notifications sent for pickup OTP
- [ ] Renter can view pickup OTP
- [ ] Owner can confirm pickup with OTP
- [ ] Media upload works during pickup confirmation
- [ ] Return OTP generated before rental ends
- [ ] Email notifications sent for return OTP
- [ ] Owner can confirm return with OTP
- [ ] Media upload works during return confirmation
- [ ] Admin can view handover media
- [ ] OTP expiration works correctly
- [ ] Invalid OTP is rejected

## Deployment Notes

1. Deploy updated Firestore security rules
2. Deploy Cloud Functions for email notifications
3. Ensure Cloudinary credentials are configured
4. Test email delivery in production environment
5. Monitor Cloud Functions logs for errors

