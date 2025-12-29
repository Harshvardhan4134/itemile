# Marketplace Payment Split Setup Guide

This guide explains how to set up Razorpay Route accounts and marketplace split payments for Lendlly.

## 🎯 Overview

The marketplace payment flow splits payments automatically:
- **Owner receives**: Rent Amount (directly to their account)
- **Lendlly receives**: Service Fee (to platform account)
- **Deposit**: Stays with Lendlly (escrow, refundable later)

## 📋 Prerequisites

1. **Razorpay Account** with Route enabled
2. **Platform Account ID** (your main Razorpay account)
3. **Owner Route Accounts** (one per owner)

## 🔧 Step 1: Enable Razorpay Route

1. **Log in to Razorpay Dashboard**
   - Go to: https://dashboard.razorpay.com
   - Navigate to **Settings** → **Route**

2. **Enable Route**
   - Enable Route for your account
   - Note your **Platform Account ID** (your main account ID)

3. **Get Platform Account ID**
   - This is usually your main Razorpay account ID
   - Format: `acc_XXXXXXXXXXXXXX`
   - Store this for Step 2

## 🔑 Step 2: Configure Platform Account ID

Set your platform account ID in Firebase Functions config:

```bash
firebase functions:config:set razorpay.platform_account_id="acc_your_platform_account_id"
firebase deploy --only functions
```

## 👤 Step 3: Create Route Accounts for Owners

### Option A: Via API (Recommended)

Owners can create their Route accounts through your app:

1. **Collect Owner Information**:
   - Name
   - Email
   - Phone
   - Bank Account Number (optional)
   - IFSC Code (optional)
   - Account Holder Name (optional)

2. **Call Cloud Function**:
```javascript
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const createRouteAccount = httpsCallable(functions, 'createRazorpayRouteAccount');

const result = await createRouteAccount({
  name: ownerName,
  email: ownerEmail,
  phone: ownerPhone,
  bankAccountNumber: bankAccount, // Optional
  ifscCode: ifsc, // Optional
  accountHolderName: accountName, // Optional
});

const accountId = result.data.accountId;
```

3. **Account ID is automatically stored** in the owner's user document:
   - Field: `razorpayAccountId`
   - Field: `razorpayAccountStatus`

### Option B: Via Razorpay Dashboard

1. Go to **Route** → **Accounts** → **Create Account**
2. Fill in owner details
3. Copy the **Account ID** (format: `acc_XXXXXXXXXXXXXX`)
4. Manually add to owner's user document in Firestore:
   ```javascript
   await updateDoc(doc(db, 'users', ownerId), {
     razorpayAccountId: 'acc_XXXXXXXXXXXXXX',
     razorpayAccountStatus: 'created',
   });
   ```

## 💰 Step 4: Payment Flow with Marketplace Split

### When Renter Pays

The system automatically:

1. **Creates Order with Transfers**:
   ```javascript
   // Automatically handled by createRazorpayOrder Cloud Function
   {
     amount: totalAmount, // Rent + Deposit + Service Fee
     transfers: [
       {
         account: ownerAccountId,  // Owner gets rent
         amount: rentAmount,
       },
       {
         account: platformAccountId, // Lendlly gets fee
         amount: serviceFee,
       }
     ],
     // Deposit stays with platform (not transferred)
   }
   ```

2. **Payment is Split**:
   - Owner receives rent immediately
   - Platform receives service fee
   - Deposit remains in escrow

3. **Transaction Updated**:
   - `paymentSplit` object stores split details
   - `depositStatus` set to `"held"`

### Frontend Usage

Update your payment calls to include marketplace split:

```typescript
import { createRazorpayPayment } from '@/lib/razorpay';

await createRazorpayPayment(
  totalAmount, // Rent + Deposit + Service Fee
  'INR',
  `Payment for ${listingTitle}`,
  {
    name: userName,
    email: userEmail,
  },
  onSuccess,
  onError,
  {
    // Marketplace split parameters
    ownerId: listing.ownerId,
    rentAmount: bookingData.totalRent,
    serviceFee: bookingData.serviceFee,
    depositAmount: bookingData.deposit,
    transactionId: transactionId,
  }
);
```

## 🔄 Step 5: Deposit Refund Flow

### When Item is Returned Safely

Refund the deposit to the renter:

```javascript
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const refundDeposit = httpsCallable(functions, 'refundDeposit');

const result = await refundDeposit({
  transactionId: transactionId,
  refundAmount: depositAmount, // Full or partial
  reason: 'Item returned safely',
});

// Transaction is automatically updated with refund details
```

### Refund Status

- `depositStatus`: `"refunded"` (full) or `"partially_refunded"`
- `refundAmount`: Amount refunded
- `refundId`: Razorpay refund ID
- `refundStatus`: `"processed"`

## 📊 Database Structure

### Users Collection

```typescript
{
  razorpayAccountId: string; // Route account ID
  razorpayAccountStatus: string; // 'created', 'active', etc.
  razorpayAccountCreatedAt: timestamp;
}
```

### Transactions Collection

```typescript
{
  paymentSplit: {
    rentAmount: number;
    serviceFee: number;
    depositAmount: number;
    ownerAccountId: string;
    platformAccountId: string | null;
  };
  depositStatus: 'held' | 'refunded' | 'partially_refunded' | 'released';
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  paidAt: timestamp;
  refundAmount?: number;
  refundId?: string;
  refundStatus?: 'pending' | 'processed' | 'failed';
  refundedAt?: timestamp;
}
```

## 🧪 Testing

### Test Payment Split

1. **Create test owner account** with Route account
2. **Make a test payment**:
   - Rent: ₹1000
   - Deposit: ₹500
   - Service Fee: ₹100
   - Total: ₹1600

3. **Verify in Razorpay Dashboard**:
   - Owner account receives ₹1000
   - Platform account receives ₹100
   - Deposit (₹500) stays with platform

4. **Test Refund**:
   - Refund ₹500 deposit
   - Verify refund in Razorpay Dashboard
   - Check transaction `depositStatus` = `"refunded"`

## ⚠️ Important Notes

1. **Route Accounts Required**: Owners must have Route accounts before receiving payments
2. **Deposit Escrow**: Deposits stay with platform until refunded
3. **Immediate Transfers**: Rent and service fee are transferred immediately
4. **Refund Processing**: Refunds can be full or partial based on damage assessment

## 🐛 Troubleshooting

### Error: "Owner does not have a Razorpay account"

**Solution**: Create Route account for the owner first using `createRazorpayRouteAccount` function.

### Error: "Platform account ID not configured"

**Solution**: Set `razorpay.platform_account_id` in Firebase Functions config.

### Payment Split Not Working

**Check**:
1. Route is enabled in Razorpay Dashboard
2. Platform account ID is configured
3. Owner has Route account created
4. Transfer amounts are correct (rent + service fee = total - deposit)

## 📚 Additional Resources

- [Razorpay Route Documentation](https://razorpay.com/docs/route/)
- [Razorpay Route API Reference](https://razorpay.com/docs/api/route/)
- [Marketplace Payments Guide](https://razorpay.com/docs/payments/route/)

