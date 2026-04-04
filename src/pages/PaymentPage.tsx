import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { createRazorpayPayment, RazorpayResponse } from "@/lib/razorpay";
import { getTransaction } from "@/lib/firestore";
import { auth } from "@/lib/firebase";

const PaymentPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initiatePayment = async () => {
      try {
        // Get payment details from URL parameters
        const transactionId = searchParams.get('transaction_id');
        const amount = parseFloat(searchParams.get('amount') || '0');
        const description = searchParams.get('description') || 'Payment';
        const ownerId = searchParams.get('owner_id') || '';
        const rentAmount = parseFloat(searchParams.get('rent_amount') || '0');
        const serviceFee = parseFloat(searchParams.get('service_fee') || '0');
        const depositAmount = parseFloat(searchParams.get('deposit_amount') || '0');

        if (!transactionId || !amount) {
          throw new Error('Missing payment details');
        }

        // Get transaction details
        const transaction = await getTransaction(transactionId);
        if (!transaction) {
          throw new Error('Transaction not found');
        }

        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error('User not authenticated');
        }

        // Prepare marketplace split if owner ID is provided
        const marketplaceSplit = ownerId ? {
          ownerId: ownerId,
          rentAmount: rentAmount,
          serviceFee: serviceFee,
          depositAmount: depositAmount,
          transactionId: transactionId,
        } : undefined;

        // Initiate Razorpay payment
        await createRazorpayPayment(
          amount,
          'INR',
          description,
          {
            name: currentUser.displayName || 'User',
            email: currentUser.email || '',
          },
          async (response: RazorpayResponse) => {
            // Payment successful - redirect to success page
            const successUrl = `/payment-success?razorpay_payment_id=${response.razorpay_payment_id}&razorpay_order_id=${response.razorpay_order_id}&razorpay_signature=${response.razorpay_signature}&transaction_id=${transactionId}`;
            window.location.href = successUrl;
          },
          async (error: any) => {
            // Payment failed or cancelled
            const errorUrl = `/payment-success?error=payment_failed&error_description=${encodeURIComponent(error.message || 'Payment failed or cancelled')}&transaction_id=${transactionId}`;
            window.location.href = errorUrl;
          },
          marketplaceSplit
        );
      } catch (err: any) {
        console.error('Error initiating payment:', err);
        setError(err.message || 'Failed to initiate payment');
      }
    };

    initiatePayment();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="app-shell flex items-center justify-center p-3 sm:p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg text-red-600">Payment Error</CardTitle>
            <CardDescription className="text-sm sm:text-base mt-2">{error}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <button
              onClick={() => window.close()}
              className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Close Window
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="app-shell flex items-center justify-center p-3 sm:p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center p-4 sm:p-6">
          <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 animate-spin text-blue-600" />
          <CardTitle className="text-base sm:text-lg md:text-xl">Opening Payment Gateway</CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-2">
            Please wait while we redirect you to Razorpay...
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};

export default PaymentPage;

