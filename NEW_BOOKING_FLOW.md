# New Booking Flow with OTP & Payment After Pickup

## Overview
The new booking flow ensures payment happens ONLY after the renter physically has the item, reducing risk for both parties.

## Flow Diagram

```
User (Renter)                    Owner                          System
     |                              |                              |
     | 1. Places Order               |                              |
     |   (No Payment Yet)            |                              |
     |------------------------------>|                              |
     |                               |                              |
     |                               | 2. Receives Notification     |
     |                               |<-----------------------------|
     |                               |                              |
     |                               | 3. Approves & Generates OTP  |
     |                               |----------------------------->|
     |                               |                              |
     | 4. Receives OTP via Email     |                              |
     |<--------------------------------------------------------------|
     |                               |                              |
     | 5. Meets Owner at Pickup      |                              |
     |<----------------------------->|                              |
     |                               |                              |
     |                               | 6. Owner Tells OTP to Renter |
     |<------------------------------|                              |
     |                               |                              |
     | 7. Enters OTP in App          |                              |
     |------------------------------------------------------------->|
     |                               |                              |
     |                               |                              | 8. Verifies OTP
     |                               |                              |
     | 9. Payment Processed          |                              |
     |<--------------------------------------------------------------|
     |                               |                              |
     | 10. Pickup Confirmed          |                              |
     |                               |<-----------------------------|
```

## Detailed Steps

### Step 1: User Places Order
- User selects item, dates, and tenure
- Clicks "Send Booking Request"
- Accepts user agreement (damage responsibility)
- **NO PAYMENT** at this stage
- Status: `pending`

### Step 2: Owner Receives Notification
- Email notification sent to owner
- Owner sees booking request in "Owner Bookings" page
- Can view booking details, renter info, dates, amount

### Step 3: Owner Approves & Generates OTP
- Owner clicks "Approve Booking" button
- System generates 6-digit OTP
- OTP saved to Firestore with 24-hour expiration
- Status changes to: `pickup_otp_generated`

### Step 4: Both Parties Receive OTP
- **Renter**: Receives email with OTP
- **Owner**: Receives email with OTP
- Both can view OTP in their respective dashboards

### Step 5: Physical Handover
- Renter meets owner at agreed location
- Owner inspects renter's identity
- Owner shows/tells the OTP to renter

### Step 6: Renter Enters OTP
- Renter opens booking in Transactions page
- Clicks "Enter Pickup OTP & Pay" button
- Enters the 6-digit OTP owner told them
- Optionally uploads photos/videos of item condition

### Step 7: OTP Verification
- System verifies OTP matches
- Checks OTP hasn't expired
- Confirms renter has physically received the item

### Step 8: Payment Processing
- **Immediately after OTP verification**
- Payment gateway (Razorpay) opens
- Renter completes payment
- Status changes to: `picked_up`

### Step 9: Pickup Confirmed
- Both parties receive confirmation
- Item is now officially rented
- Rental period begins

## Benefits of This Flow

### For Renters:
✅ Pay only after receiving the item
✅ No risk of paying for item they don't receive
✅ Can inspect item before payment
✅ Protected by OTP verification

### For Owners:
✅ OTP proves renter physically has the item
✅ Payment guaranteed after handover
✅ Can verify renter identity before giving item
✅ Documentation with photos/videos

### For Platform:
✅ Reduces disputes
✅ Ensures fair transactions
✅ Audit trail with OTP and media
✅ Automatic payment after verification

## Technical Implementation

### Database Schema
```typescript
Transaction {
  status: 'pending' | 'pickup_otp_generated' | 'picked_up' | 'return_otp_generated' | 'returned' | 'completed'
  pickupOtp: string (6 digits)
  pickupOtpExpiresAt: Timestamp (24 hours)
  pickupConfirmedAt: Timestamp
  confirmedBy: string (userId who confirmed)
  paymentStatus: 'pending' | 'completed'
  agreementAccepted: boolean
}
```

### Key Functions
- `generatePickupOtp()` - Creates OTP when owner approves
- `confirmPickupOtp()` - Verifies OTP and marks pickup complete
- Payment triggered automatically after OTP confirmation

### Security
- OTP expires in 24 hours
- Only owner/renter can verify OTP
- Payment processed only after successful verification
- All actions logged with timestamps

## User Interface

### Renter View (Transactions Page)
1. **Pending**: "Waiting for owner approval"
2. **OTP Generated**: "Enter Pickup OTP & Pay" button (green)
3. **Picked Up**: "Pickup confirmed" with timestamp

### Owner View (Owner Bookings Page)
1. **Pending**: "Approve Booking" button (green)
2. **OTP Generated**: Shows OTP in large Rapido-style display
3. **Picked Up**: "Pickup confirmed" with timestamp

## Email Notifications

1. **Booking Request**: Sent to owner when renter places order
2. **OTP Generated**: Sent to both parties with OTP code
3. **Pickup Confirmed**: Sent to both parties after OTP verification
4. **Payment Successful**: Sent to renter after payment

## Edge Cases Handled

- OTP expiration (24 hours)
- Invalid OTP attempts
- Network failures during payment
- Booking cancellation before approval
- Old bookings (status: 'active') can generate OTP retroactively

## Migration for Existing Bookings

Bookings with status `'active'` (approved before OTP system):
- Show "Generate Pickup OTP" button for owner
- Can generate OTP retroactively
- Continues with normal flow after OTP generation

