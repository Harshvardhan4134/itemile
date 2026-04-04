import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, CreditCard, Wallet, Banknote } from "lucide-react";
import { BookingData } from "./TenureSelector";
import { createRazorpayPayment, RazorpayResponse } from "@/lib/razorpay";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingData: BookingData | null;
  listingTitle: string;
  ownerId?: string; // Owner ID for marketplace split
  transactionId?: string; // Transaction ID for marketplace split
  onPaymentComplete: (paymentMethod: 'SecurePay' | 'online' | 'offline', razorpayResponse?: RazorpayResponse, agreementAccepted?: boolean) => Promise<void>;
  onPaymentCancelled?: () => Promise<void>;
  isProcessing?: boolean;
  agreementAccepted?: boolean;
}

export default function PaymentDialog({
  open,
  onOpenChange,
  bookingData,
  listingTitle,
  ownerId,
  transactionId,
  onPaymentComplete,
  onPaymentCancelled,
  isProcessing = false,
  agreementAccepted: agreementAcceptedProp = false,
}: PaymentDialogProps) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'SecurePay' | 'online' | 'offline'>('online');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { toast } = useToast();
  
  // Use agreement from prop (set by parent after UserAgreementDialog)
  const agreementAccepted = agreementAcceptedProp;


  if (!bookingData) return null;

  const handlePaymentMethodSelect = (method: 'SecurePay' | 'online' | 'offline') => {
    setSelectedPaymentMethod(method);
  };

  const handlePayment = async () => {
    // Progressive verification check at checkout
    const currentUser = auth.currentUser;
    if (currentUser) {
      const { getUser } = await import('@/lib/firestore');
      const userData = await getUser(currentUser.uid);
      if (!userData || userData.verificationStatus !== 'approved') {
        toast({
          title: "Verification Required",
          description: "Please complete your verification to proceed with payment. Verification helps us ensure a safe rental experience for everyone.",
          variant: "destructive"
        });
        return;
      }
    }

    // If SecurePay is required, only allow SecurePay
    const paymentMethod = bookingData.requiresSecurePay ? 'SecurePay' : selectedPaymentMethod;
    
    // For offline payments, process directly without Razorpay
    if (paymentMethod === 'offline') {
      await onPaymentComplete(paymentMethod, undefined, agreementAccepted);
      return;
    }

    // For online/SecurePay, use Razorpay
    setIsProcessingPayment(true);
    
    try {
      const currentUser = auth.currentUser;
      const userEmail = currentUser?.email || '';
      const userName = currentUser?.displayName || 'User';
      
      // Build payment URL with all necessary parameters
      const paymentUrl = new URL('/payment', window.location.origin);
      paymentUrl.searchParams.set('transaction_id', transactionId || '');
      paymentUrl.searchParams.set('amount', bookingData.payableNow.toString());
      paymentUrl.searchParams.set('description', `Payment for ${listingTitle} - ${bookingData.units} ${bookingData.durationType}`);
      if (ownerId) {
        paymentUrl.searchParams.set('owner_id', ownerId);
        paymentUrl.searchParams.set('rent_amount', bookingData.totalRent.toString());
        paymentUrl.searchParams.set('service_fee', (bookingData.serviceFee || 0).toString());
        paymentUrl.searchParams.set('deposit_amount', (bookingData.deposit || 0).toString());
      }

      // Open payment page in new tab (responsive for mobile)
      const isMobile = window.innerWidth < 768;
      const windowFeatures = isMobile ? '' : 'width=800,height=600';
      const paymentWindow = window.open(paymentUrl.toString(), '_blank', windowFeatures);
      
      if (!paymentWindow) {
        throw new Error('Please allow popups to proceed with payment');
      }

      setIsProcessingPayment(false);
      
      toast({
        title: "Payment Window Opened",
        description: "Please complete the payment in the new window.",
      });

      // Listen for payment completion (will be handled by payment success page)
      // Close the payment dialog
      onOpenChange(false);
    } catch (error: any) {
      setIsProcessingPayment(false);
      console.error('Error initiating payment:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Complete Payment</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Review your booking details and complete payment for {listingTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* Booking Summary */}
          <Card>
            <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium text-right">
                  {bookingData.units} {bookingData.durationType === 'days' ? 'day(s)' : 'month(s)'}
                </span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Rent per {bookingData.durationType === 'days' ? 'day' : 'month'}</span>
                <span className="font-medium">₹{bookingData.rentPerUnit.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Total Rent</span>
                <span className="font-medium">₹{bookingData.totalRent.toLocaleString()}</span>
              </div>
              {bookingData.deposit > 0 && (
                <div className="flex justify-between text-xs sm:text-sm flex-wrap gap-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    Deposit {bookingData.requiresDeposit && <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 py-0">Required</Badge>}
                  </span>
                  <span className="font-medium">₹{bookingData.deposit.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Service Fee</span>
                <span className="font-medium">₹{bookingData.serviceFee.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base sm:text-lg font-semibold">
                <span>Total Payable</span>
                <span>₹{bookingData.payableNow.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Selection */}
          {!bookingData.requiresSecurePay && (
            <div className="space-y-2 sm:space-y-3">
              <label className="text-xs sm:text-sm font-medium">Select Payment Method</label>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant={selectedPaymentMethod === 'online' ? 'default' : 'outline'}
                  className="w-full justify-start h-auto p-3 sm:p-4"
                  onClick={() => handlePaymentMethodSelect('online')}
                  disabled={isProcessing || isProcessingPayment}
                >
                  <div className="flex items-center gap-2 sm:gap-3 w-full">
                    <Wallet className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium text-xs sm:text-sm">Razorpay Payment</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground truncate">UPI, Cards, Net Banking, Wallets</div>
                    </div>
                    {selectedPaymentMethod === 'online' && <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />}
                  </div>
                </Button>
                <Button
                  variant={selectedPaymentMethod === 'SecurePay' ? 'default' : 'outline'}
                  className="w-full justify-start h-auto p-3 sm:p-4"
                  onClick={() => handlePaymentMethodSelect('SecurePay')}
                  disabled={isProcessing || isProcessingPayment}
                >
                  <div className="flex items-center gap-2 sm:gap-3 w-full">
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium text-xs sm:text-sm">SecurePay</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground truncate">Platform protected payment</div>
                    </div>
                    {selectedPaymentMethod === 'SecurePay' && <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />}
                  </div>
                </Button>
                <Button
                  variant={selectedPaymentMethod === 'offline' ? 'default' : 'outline'}
                  className="w-full justify-start h-auto p-3 sm:p-4"
                  onClick={() => handlePaymentMethodSelect('offline')}
                  disabled={isProcessing || isProcessingPayment}
                >
                  <div className="flex items-center gap-2 sm:gap-3 w-full">
                    <Banknote className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium text-xs sm:text-sm">Cash on Delivery</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground truncate">Pay when you receive the item</div>
                    </div>
                    {selectedPaymentMethod === 'offline' && <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />}
                  </div>
                </Button>
                {selectedPaymentMethod === 'offline' && (
                  <div className="flex items-start gap-2 p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-[10px] sm:text-xs">
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-blue-800 dark:text-blue-200">
                      <div className="font-medium mb-1">Note:</div>
                      <div>After owner approval, you will receive a pickup OTP via email. Show this OTP to the owner when collecting the item.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {bookingData.requiresSecurePay && (
            <div className="flex items-start gap-2 p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs sm:text-sm">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-blue-800 dark:text-blue-200">
                <div className="font-medium mb-1">SecurePay Required</div>
                <div className="text-[10px] sm:text-xs">
                  This item requires SecurePay payment for platform liability and insurance coverage.
                </div>
              </div>
            </div>
          )}

          {/* Payment Button */}
          <Button
            className="w-full text-xs sm:text-sm"
            onClick={handlePayment}
            disabled={isProcessing || isProcessingPayment}
            size="lg"
          >
            {isProcessing || isProcessingPayment ? (
              'Processing Payment...'
            ) : (
              <>
                <CreditCard className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                {selectedPaymentMethod === 'offline' 
                  ? 'Confirm Booking Request' 
                  : `Pay ₹${bookingData.payableNow.toLocaleString()}`}
              </>
            )}
          </Button>
          
          {selectedPaymentMethod === 'online' && !bookingData.requiresSecurePay && (
            <div className="flex items-start gap-2 p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-[10px] sm:text-xs">
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-blue-800 dark:text-blue-200">
                <div className="font-medium mb-1">Secure Payment:</div>
                <div>Your payment will be processed securely through Razorpay. You can pay using UPI, Credit/Debit Cards, Net Banking, or Wallets.</div>
              </div>
            </div>
          )}

          {/* Agreement Confirmation - Already accepted in previous dialog */}
          {agreementAccepted && (
            <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-green-800 dark:text-green-200">
                You have accepted the user agreement. You are responsible for any damage, breakage, or loss of the rented item.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

