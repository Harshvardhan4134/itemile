import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { updateTransaction, getTransaction } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Verifying payment...');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Check if payment was cancelled
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error || errorDescription) {
          setStatus('failed');
          setMessage(errorDescription || 'Payment was cancelled or failed. Please try again.');
          localStorage.removeItem('pending_payment_transaction_id');
          return;
        }

        // Get payment details from URL parameters
        const razorpayPaymentId = searchParams.get('razorpay_payment_id');
        const razorpayOrderId = searchParams.get('razorpay_order_id');
        const razorpaySignature = searchParams.get('razorpay_signature');
        const transactionId = searchParams.get('transaction_id') || localStorage.getItem('pending_payment_transaction_id');

        if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
          throw new Error('Payment details missing');
        }

        if (!transactionId) {
          throw new Error('Transaction ID not found');
        }

        // Verify payment signature
        const verifyPayment = httpsCallable(functions, 'verifyRazorpayPayment');
        const verifyResult = await verifyPayment({
          orderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
          signature: razorpaySignature,
          transactionId: transactionId,
        });

        if ((verifyResult.data as any).verified) {
          // Update transaction with payment details
          await updateTransaction(transactionId, {
            razorpayPaymentId: razorpayPaymentId,
            razorpayOrderId: razorpayOrderId,
            razorpaySignature: razorpaySignature,
            paymentStatus: 'completed',
            paidAt: new Date(),
          });

          // Auto-generate return OTP after payment
          try {
            const { generateReturnOtp } = await import('@/lib/firestore');
            await generateReturnOtp(transactionId);
            console.log('Return OTP generated automatically after payment');
          } catch (error) {
            console.error('Error generating return OTP:', error);
          }

          // Clear stored transaction ID
          localStorage.removeItem('pending_payment_transaction_id');

          setStatus('success');
          setMessage('Payment successful! Your booking has been confirmed.');

          toast({
            title: "Payment Successful!",
            description: "Your payment has been processed successfully. Return OTP has been generated.",
          });

          // Redirect to transactions page after 3 seconds
          setTimeout(() => {
            navigate('/transactions');
          }, 3000);
        } else {
          throw new Error('Payment verification failed');
        }
      } catch (error: any) {
        console.error('Payment verification error:', error);
        setStatus('failed');
        setMessage(error.message || 'Payment verification failed. Please contact support if the amount was deducted.');

        toast({
          title: "Payment Verification Failed",
          description: error.message || "Please contact support if the amount was deducted.",
          variant: "destructive",
        });
      }
    };

    verifyPayment();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center p-4 sm:p-6">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 animate-spin text-blue-600" />
              <CardTitle className="text-base sm:text-lg md:text-xl">Processing Payment</CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-2 break-words">{message}</CardDescription>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-green-600" />
              <CardTitle className="text-base sm:text-lg md:text-xl text-green-600">Payment Successful!</CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-2 break-words">{message}</CardDescription>
            </>
          )}
          {status === 'failed' && (
            <>
              <XCircle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-red-600" />
              <CardTitle className="text-base sm:text-lg md:text-xl text-red-600">Payment Failed</CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-2 break-words">{message}</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
          {status === 'success' && (
            <div className="text-center space-y-2 sm:space-y-3">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Redirecting to transactions page...
              </p>
              <Button 
                onClick={() => navigate('/transactions')} 
                className="w-full text-sm sm:text-base py-2.5 sm:py-3"
                size="lg"
              >
                Go to Transactions
              </Button>
            </div>
          )}
          {status === 'failed' && (
            <div className="text-center space-y-2 sm:space-y-3">
              <Button 
                onClick={() => navigate('/transactions')} 
                variant="outline" 
                className="w-full text-sm sm:text-base py-2.5 sm:py-3"
                size="lg"
              >
                Go to Transactions
              </Button>
              <Button 
                onClick={() => navigate('/contact')} 
                className="w-full text-sm sm:text-base py-2.5 sm:py-3"
                size="lg"
              >
                Contact Support
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;

