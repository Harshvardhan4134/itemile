import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Info, Package, Mail, Calendar, ArrowRight } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { updateTransaction, getTransaction, Transaction } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Verifying payment...');
  const [transaction, setTransaction] = useState<Transaction | null>(null);

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
          // Get current transaction to check status
          const currentTransaction = await getTransaction(transactionId);
          
          // Update transaction with payment details
          // Only update status to 'picked_up' if it's not already at a later stage
          // (Payment after OTP verification should already be 'picked_up', but we ensure it)
          const statusUpdate: any = {
            razorpayPaymentId: razorpayPaymentId,
            razorpayOrderId: razorpayOrderId,
            razorpaySignature: razorpaySignature,
            paymentStatus: 'completed',
            paidAt: new Date(),
          };
          
          // Only update status if it's still pending or earlier
          // If already picked_up or later, preserve the existing status
          if (!currentTransaction || 
              currentTransaction.status === 'pending' || 
              currentTransaction.status === 'PENDING' ||
              currentTransaction.status === 'pickup_otp_generated') {
            statusUpdate.status = 'picked_up';
          }
          
          await updateTransaction(transactionId, statusUpdate);

          // Auto-generate return OTP after payment
          let returnOtpGenerated = false;
          try {
            const { generateReturnOtp } = await import('@/lib/firestore');
            await generateReturnOtp(transactionId);
            returnOtpGenerated = true;
            console.log('Return OTP generated automatically after payment');
          } catch (error) {
            console.error('Error generating return OTP:', error);
          }

          // Fetch updated transaction details
          const updatedTransaction = await getTransaction(transactionId);
          if (updatedTransaction) {
            setTransaction(updatedTransaction);
          }

          // Clear stored transaction ID
          localStorage.removeItem('pending_payment_transaction_id');

          setStatus('success');
          setMessage('Payment successful! Your booking has been confirmed.');

          toast({
            title: "Payment Successful!",
            description: returnOtpGenerated 
              ? "Your payment has been processed successfully. Return OTP has been generated."
              : "Your payment has been processed successfully.",
          });
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
            <div className="space-y-4">
              {/* Success Note */}
              <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <div className="font-semibold mb-1">Payment Confirmed!</div>
                  <div className="text-xs sm:text-sm">
                    Your payment has been successfully processed and your booking is now active.
                  </div>
                </AlertDescription>
              </Alert>

              {/* Transaction Details */}
              {transaction && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <Package className="h-4 w-4" />
                    Booking Details
                  </div>
                  <div className="space-y-1.5 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Item:</span>
                      <span className="font-medium">{transaction.listingTitle || 'N/A'}</span>
                    </div>
                    {transaction.startDate && transaction.endDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rental Period:</span>
                        <span className="font-medium">
                          {(() => {
                            try {
                              const start = transaction.startDate?.toDate ? transaction.startDate.toDate() : 
                                           transaction.startDate instanceof Date ? transaction.startDate :
                                           new Date(transaction.startDate);
                              const end = transaction.endDate?.toDate ? transaction.endDate.toDate() : 
                                         transaction.endDate instanceof Date ? transaction.endDate :
                                         new Date(transaction.endDate);
                              return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
                            } catch {
                              return 'N/A';
                            }
                          })()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount Paid:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        ₹{((transaction.totalRent || transaction.amount || 0) + (transaction.deposit || 0) + (transaction.serviceFee || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Next Steps */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-blue-800 dark:text-blue-200">
                  <Info className="h-4 w-4" />
                  What's Next?
                </div>
                <div className="space-y-2 text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>Your booking is now active and you can use the item.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>Return OTP has been generated and will be available in your transaction details.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>You'll receive email notifications about your booking status.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>When returning the item, use the Return OTP from your transaction details.</span>
                  </div>
                </div>
              </div>

              {/* Important Note */}
              <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-800 dark:text-amber-200 text-xs sm:text-sm">
                  <div className="font-semibold mb-1">Important:</div>
                  <div>
                    Please take good care of the rented item. You are responsible for any damage, breakage, or loss. 
                    The Return OTP will be required when you return the item to the owner.
                  </div>
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button 
                  onClick={() => navigate('/transactions')} 
                  className="w-full text-sm sm:text-base py-2.5 sm:py-3"
                  size="lg"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  View My Transactions
                </Button>
                <Button 
                  onClick={() => navigate('/')} 
                  variant="outline"
                  className="w-full text-sm sm:text-base py-2.5 sm:py-3"
                  size="lg"
                >
                  Continue Browsing
                </Button>
              </div>
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

