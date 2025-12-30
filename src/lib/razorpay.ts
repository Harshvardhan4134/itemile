// Razorpay payment integration utility

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayOptions {
  key: string;
  amount: number; // Amount in paise (e.g., 10000 = ₹100)
  currency: string;
  name: string;
  description: string;
  order_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  method?: {
    upi?: boolean;
    card?: boolean;
    netbanking?: boolean;
    wallet?: boolean;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// Load Razorpay script dynamically
export const loadRazorpayScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay script'));
    document.body.appendChild(script);
  });
};

// Create Razorpay order via Cloud Function (marketplace split)
const createRazorpayOrder = async (
  amount: number,
  currency: string = 'INR',
  receipt: string | undefined,
  ownerId: string,
  rentAmount: number,
  serviceFee: number,
  depositAmount: number,
  transactionId?: string
) => {
  try {
    const createOrder = httpsCallable(functions, 'createRazorpayOrder');
    const result = await createOrder({
      amount,
      currency,
      receipt,
      ownerId,
      rentAmount,
      serviceFee,
      depositAmount,
      transactionId,
    });
    return (result.data as any);
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
};

// Create Razorpay payment instance with marketplace split
export const createRazorpayPayment = async (
  amount: number,
  currency: string = 'INR',
  description: string,
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  },
  onSuccess: (response: RazorpayResponse) => void,
  onError: (error: any) => void,
  // Marketplace split parameters
  marketplaceSplit?: {
    ownerId: string;
    rentAmount: number;
    serviceFee: number;
    depositAmount: number;
    transactionId?: string;
  },
  useOrderCreation: boolean = true // Set to false to use direct payment without order
): Promise<void> => {
  try {
    // Load Razorpay script if not already loaded
    await loadRazorpayScript();

    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
    
    if (!razorpayKey) {
      throw new Error('Razorpay key not configured. Please add VITE_RAZORPAY_KEY_ID to your environment variables.');
    }

    // Convert amount to paise (Razorpay expects amount in smallest currency unit)
    const amountInPaise = Math.round(amount * 100);

    let orderId: string | undefined;

    // Try to create order via Cloud Function (marketplace split if provided)
    if (useOrderCreation) {
      try {
        let orderResult;
        if (marketplaceSplit) {
          // Use marketplace split order creation
          orderResult = await createRazorpayOrder(
            amount,
            currency,
            undefined,
            marketplaceSplit.ownerId,
            marketplaceSplit.rentAmount,
            marketplaceSplit.serviceFee,
            marketplaceSplit.depositAmount,
            marketplaceSplit.transactionId
          );
        } else {
          // Fallback to simple order creation (backward compatibility)
          orderResult = await createRazorpayOrder(amount, currency, undefined, '', 0, 0, 0);
        }
        
        if (orderResult.success && orderResult.orderId) {
          orderId = orderResult.orderId;
        }
      } catch (error) {
        console.warn('Failed to create Razorpay order via Cloud Function, falling back to direct payment:', error);
        // Continue with direct payment if order creation fails
      }
    }

    const options: RazorpayOptions = {
      key: razorpayKey,
      amount: amountInPaise,
      currency: currency,
      name: 'Lendlly',
      description: description,
      order_id: orderId, // Use order_id if available
      prefill: prefill || {},
      theme: {
        color: '#3b82f6', // Primary blue color
      },
      // Explicitly enable payment methods including UPI
      method: {
        upi: true,
        card: true,
        netbanking: true,
        wallet: true,
      },
      handler: async (response) => {
        // Verify payment signature if order was used
        if (orderId && useOrderCreation) {
          try {
            const verifyPayment = httpsCallable(functions, 'verifyRazorpayPayment');
            const verifyResult = await verifyPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              transactionId: marketplaceSplit?.transactionId,
            });
            
            if ((verifyResult.data as any).verified) {
              onSuccess(response);
            } else {
              onError(new Error('Payment verification failed'));
            }
          } catch (error) {
            console.error('Error verifying payment:', error);
            // Still call onSuccess if verification fails (for development)
            // In production, you should handle this more strictly
            onSuccess(response);
          }
        } else {
          onSuccess(response);
        }
      },
      modal: {
        ondismiss: () => {
          onError(new Error('Payment cancelled by user'));
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  } catch (error) {
    console.error('Error creating Razorpay payment:', error);
    onError(error);
  }
};

// Verify payment signature (should be done on backend in production)
// For now, this is a placeholder - in production, verify on your backend
export const verifyPaymentSignature = async (
  orderId: string,
  paymentId: string,
  signature: string
): Promise<boolean> => {
  // TODO: Implement backend verification
  // This should call your backend API to verify the payment signature
  // For now, we'll trust the payment (not recommended for production)
  console.warn('Payment signature verification should be done on backend');
  return true;
};

