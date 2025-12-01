# Razorpay Payment Integration Setup

## Overview
Razorpay has been integrated as the primary payment gateway for Lendlly. It supports multiple payment methods including UPI, Credit/Debit Cards, Net Banking, and Wallets.

## Prerequisites

1. **Razorpay Account**: Sign up at [https://razorpay.com](https://razorpay.com)
2. **API Keys**: Get your API keys from Razorpay Dashboard

## Setup Instructions

### 1. Get Your Razorpay API Keys

1. Log in to your [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Go to **Settings** → **API Keys**
3. Generate **Test Keys** for development (or **Live Keys** for production)
4. Copy your **Key ID** (starts with `rzp_test_` for test mode or `rzp_live_` for live mode)

### 2. Configure Environment Variables

Create or update your `.env` file in the root directory:

```env
# Razorpay Configuration
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id_here
```

**Important Notes:**
- For **development/testing**: Use test keys (starts with `rzp_test_`)
- For **production**: Use live keys (starts with `rzp_live_`)
- Never commit your `.env` file to version control
- The Key Secret is not needed on the frontend (only Key ID is required)

### 3. Restart Development Server

After adding the environment variable, restart your development server:

```bash
npm run dev
```

## How It Works

### Payment Flow

1. **User selects payment method** - Chooses Razorpay Payment or SecurePay
2. **Payment dialog opens** - Shows booking summary and payment options
3. **User clicks "Pay"** - Razorpay checkout modal opens
4. **User completes payment** - Selects payment method (UPI, Card, Net Banking, Wallet)
5. **Payment processed** - Razorpay processes the payment
6. **Success callback** - Transaction is updated with payment details
7. **Booking confirmed** - User is redirected to chat/transactions page

### Payment Methods Supported

- ✅ **UPI** (Google Pay, PhonePe, Paytm, BHIM, etc.)
- ✅ **Credit/Debit Cards** (Visa, Mastercard, RuPay, Amex)
- ✅ **Net Banking** (All major banks)
- ✅ **Wallets** (Paytm, Freecharge, Mobikwik, etc.)

## Features

- ✅ Secure payment processing through Razorpay
- ✅ Multiple payment methods support
- ✅ Automatic payment verification
- ✅ Payment status tracking
- ✅ Transaction history
- ✅ Error handling and user feedback

## Payment Status Handling

### Successful Payment
- Transaction status → `active`
- Payment details stored in transaction
- Booking confirmed
- Owner notified

### Failed/Cancelled Payment
- User sees error message
- Transaction remains in pending state
- User can retry payment

### Offline Payment
- Transaction status → `pending`
- No Razorpay integration
- Payment collected on delivery

## Security Notes

### Frontend (Current Implementation)
- Only Key ID is exposed (safe for frontend)
- Payment signature verification should be done on backend
- Payment details are stored in Firestore

### Backend Verification (Recommended for Production)

For production, you should verify payment signatures on your backend:

1. **Create a Cloud Function** to verify payments
2. **Store Key Secret** securely (never expose to frontend)
3. **Verify signature** using Razorpay's verification method

Example backend verification (Node.js):

```javascript
const Razorpay = require('razorpay');
const crypto = require('crypto');

function verifyPaymentSignature(orderId, paymentId, signature, secret) {
  const text = orderId + '|' + paymentId;
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(text)
    .digest('hex');
  
  return generatedSignature === signature;
}
```

## Testing

### Test Mode
- Use test API keys (`rzp_test_...`)
- Use Razorpay test cards: [Test Cards](https://razorpay.com/docs/payments/test-cards/)
- Test UPI: Use any UPI ID (payment will be simulated)

### Test Cards
- **Success**: `4111 1111 1111 1111`
- **Failure**: `5104 0600 0000 0008`
- **CVV**: Any 3 digits
- **Expiry**: Any future date

## Troubleshooting

### Payment Modal Not Opening
- Check if `VITE_RAZORPAY_KEY_ID` is set in `.env`
- Restart development server after adding env variable
- Check browser console for errors
- Ensure Razorpay script is loading (check Network tab)

### Payment Failing
- Verify API key is correct
- Check if you're using test keys in test mode
- Ensure amount is in valid format (minimum ₹1)
- Check Razorpay dashboard for payment logs

### Payment Success but Transaction Not Updated
- Check browser console for errors
- Verify Firestore rules allow transaction updates
- Check network tab for failed API calls

## Migration from PhonePe

The PhonePe QR code payment has been replaced with Razorpay. The following changes were made:

- ✅ Removed PhonePe QR code generation
- ✅ Removed `qrcode.react` dependency (if not used elsewhere)
- ✅ Updated payment dialog to use Razorpay
- ✅ Updated payment flow to handle Razorpay callbacks
- ✅ Added Razorpay payment details to transactions

## Environment Variables

### Required
- `VITE_RAZORPAY_KEY_ID` - Your Razorpay Key ID

### Optional (for future backend integration)
- `RAZORPAY_KEY_SECRET` - Your Razorpay Key Secret (backend only, never expose to frontend)

## Production Checklist

Before going live:

- [ ] Switch to live API keys (`rzp_live_...`)
- [ ] Implement backend payment verification
- [ ] Set up webhooks for payment status updates
- [ ] Test all payment methods
- [ ] Configure refund handling
- [ ] Set up payment analytics
- [ ] Review Razorpay dashboard settings
- [ ] Enable payment notifications

## Additional Resources

- [Razorpay Documentation](https://razorpay.com/docs/)
- [Razorpay Checkout Integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/)
- [Razorpay Test Cards](https://razorpay.com/docs/payments/test-cards/)
- [Razorpay Webhooks](https://razorpay.com/docs/webhooks/)

## Support

For Razorpay-related issues:
- Check [Razorpay Support](https://razorpay.com/support/)
- Review [Razorpay Documentation](https://razorpay.com/docs/)

For application-specific issues:
- Check browser console for errors
- Review Firestore transaction logs
- Check network requests in browser DevTools

