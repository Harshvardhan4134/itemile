# PhonePe QR Code Payment Setup

## Overview
PhonePe QR code payment has been integrated as a temporary payment solution until Razorpay is fully implemented.

## Setup Instructions

### 1. Get Your PhonePe UPI ID
- Open PhonePe app on your phone
- Go to Profile → Payment Settings → UPI IDs
- Copy your UPI ID (format: `yourname@ybl` or `yourname@paytm`)

### 2. Configure UPI ID in Environment Variables

Create a `.env` file in the root directory (if it doesn't exist) and add:

```env
VITE_PHONEPE_UPI_ID=yourname@ybl
```

Replace `yourname@ybl` with your actual PhonePe UPI ID.

### 3. Restart Development Server

After adding the environment variable, restart your development server:

```bash
npm run dev
```

## How It Works

1. **User selects PhonePe payment** - QR code option appears in payment dialog
2. **QR code is generated** - Contains UPI payment link with amount and description
3. **User scans QR code** - Opens PhonePe app with pre-filled payment details
4. **User completes payment** - In PhonePe app
5. **User confirms payment** - Clicks "I've Paid" button in the dialog
6. **Transaction is updated** - Status changes to 'active' and booking is confirmed

## Payment Flow

```
User selects dates/duration
    ↓
Clicks "Continue to Payment"
    ↓
Payment Dialog opens
    ↓
User selects "PhonePe QR Code"
    ↓
QR Code is displayed
    ↓
User scans with PhonePe app
    ↓
User completes payment in PhonePe
    ↓
User clicks "I've Paid - Confirm Payment"
    ↓
Transaction status → 'active'
    ↓
User navigates to chat with owner
```

## Features

- ✅ QR code generation with pre-filled amount
- ✅ UPI payment string with transaction details
- ✅ Payment confirmation flow
- ✅ Automatic transaction status update
- ✅ User-friendly payment instructions

## Security Notes

- The UPI ID is stored in environment variables (not hardcoded)
- Payment confirmation is manual (user must click after paying)
- For production, consider adding payment verification webhooks
- QR code contains encrypted UPI payment string

## Future Enhancements (When Razorpay is Added)

- Automatic payment verification
- Payment status webhooks
- Refund handling
- Payment history tracking
- Multiple payment gateway support

## Troubleshooting

### QR Code not showing
- Check if `VITE_PHONEPE_UPI_ID` is set in `.env`
- Restart development server after adding env variable
- Check browser console for errors

### Payment not processing
- Verify UPI ID format is correct
- Ensure PhonePe app is installed on user's device
- Check transaction status in Firestore

### QR Code not scanning
- Ensure QR code is clearly visible
- Check if PhonePe app has camera permissions
- Try refreshing the page and generating new QR code

