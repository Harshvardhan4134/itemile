// Razorpay payment integration utility

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

// Create Razorpay payment instance
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
  onError: (error: any) => void
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

    const options: RazorpayOptions = {
      key: razorpayKey,
      amount: amountInPaise,
      currency: currency,
      name: 'Lendlly',
      description: description,
      prefill: prefill || {},
      theme: {
        color: '#3b82f6', // Primary blue color
      },
      handler: (response) => {
        onSuccess(response);
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

