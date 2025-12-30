import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OtpDisplay } from "./OtpDisplay";
import { OtpConfirmation } from "./OtpConfirmation";
import { Calendar, Clock, User, DollarSign, CheckCircle, AlertCircle, Package, CreditCard, Banknote } from "lucide-react";
import { Transaction, getUser, User as UserType, generateReturnOtp, sendEmailNotification, getTransaction, generatePickupOtp, confirmPickupOtp, updateTransaction } from "@/lib/firestore";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface BookingDetailProps {
  booking: Transaction;
  renter?: UserType;
  listingTitle?: string;
  currentUserId: string;
  onStatusUpdate?: () => void;
  onApprove?: () => void;
  onPaymentRequired?: (transactionId: string) => void;
}

export const BookingDetail = ({ 
  booking, 
  renter, 
  listingTitle, 
  currentUserId,
  onStatusUpdate,
  onApprove,
  onPaymentRequired
}: BookingDetailProps) => {
  const [showPickupConfirmation, setShowPickupConfirmation] = useState(false);
  const [showReturnConfirmation, setShowReturnConfirmation] = useState(false);
  const [isGeneratingReturnOtp, setIsGeneratingReturnOtp] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<Transaction>(booking);
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'online' | 'offline' | null>(null);
  const { toast } = useToast();
  
  // Real-time listener for booking updates
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'transactions', booking.id),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const updatedBooking = {
            id: docSnapshot.id,
            ...docSnapshot.data()
          } as Transaction;
          console.log('Booking updated in real-time:', {
            id: updatedBooking.id,
            status: updatedBooking.status,
            pickupOtp: updatedBooking.pickupOtp ? '***' : 'none',
            paymentMode: updatedBooking.paymentMode,
            paymentMethod: updatedBooking.paymentMethod,
            paymentStatus: updatedBooking.paymentStatus,
            razorpayPaymentId: updatedBooking.razorpayPaymentId
          });
          setCurrentBooking(updatedBooking);
        }
      },
      (error) => {
        console.error('Error listening to booking updates:', error);
      }
    );

    return () => unsubscribe();
  }, [booking.id]);

  // Update currentBooking when booking prop changes
  useEffect(() => {
    setCurrentBooking(booking);
  }, [booking]);

  const isOwner = currentBooking.ownerId === currentUserId;
  const isRenter = currentBooking.renterId === currentUserId;

  // Debug: Log return section visibility
  useEffect(() => {
    const shouldShowReturn = (currentBooking.status === 'picked_up' || 
      currentBooking.status === 'return_otp_generated' || 
      currentBooking.status === 'returned') && 
     (currentBooking.paymentStatus === 'completed' || 
      currentBooking.razorpayPaymentId || 
      currentBooking.paymentMode === 'offline' ||
      currentBooking.paymentMethod === 'cash_on_delivery');
    
    console.log('Return section visibility check:', {
      status: currentBooking.status,
      paymentStatus: currentBooking.paymentStatus,
      razorpayPaymentId: currentBooking.razorpayPaymentId,
      paymentMode: currentBooking.paymentMode,
      paymentMethod: currentBooking.paymentMethod,
      shouldShow: shouldShowReturn
    });
  }, [currentBooking.status, currentBooking.paymentStatus, currentBooking.razorpayPaymentId, currentBooking.paymentMode, currentBooking.paymentMethod]);

  // Track if payment dialog has been auto-opened for this transaction to prevent multiple triggers
  const paymentDialogAutoOpenedRef = useRef<string | null>(null);

  // Auto-open payment dialog when status becomes 'picked_up' and payment not completed
  useEffect(() => {
    // Only auto-open if:
    // 1. User is renter
    // 2. Status is picked_up
    // 3. Payment is not completed
    // 4. No Razorpay payment ID exists
    // 5. Payment mode is not offline
    // 6. Payment method is not cash_on_delivery
    // 7. Dialog is not already open
    // 8. Dialog hasn't been auto-opened for this transaction ID yet
    const shouldOpen = isRenter && 
        currentBooking.status === 'picked_up' && 
        currentBooking.paymentStatus !== 'completed' && 
        !currentBooking.razorpayPaymentId && 
        currentBooking.paymentMode !== 'offline' &&
        currentBooking.paymentMethod !== 'cash_on_delivery' &&
        !showPaymentMethodDialog &&
        paymentDialogAutoOpenedRef.current !== currentBooking.id;
    
    if (shouldOpen) {
      console.log('Auto-opening payment method dialog - status is picked_up and payment not completed', {
        transactionId: currentBooking.id,
        status: currentBooking.status,
        paymentStatus: currentBooking.paymentStatus,
        razorpayPaymentId: currentBooking.razorpayPaymentId,
        paymentMode: currentBooking.paymentMode,
        paymentMethod: currentBooking.paymentMethod
      });
      setShowPaymentMethodDialog(true);
      paymentDialogAutoOpenedRef.current = currentBooking.id;
    }
    
    // Reset the flag if payment is completed or status changes away from picked_up
    if (currentBooking.paymentStatus === 'completed' || 
        currentBooking.razorpayPaymentId || 
        currentBooking.status !== 'picked_up' ||
        currentBooking.paymentMode === 'offline' ||
        currentBooking.paymentMethod === 'cash_on_delivery') {
      if (paymentDialogAutoOpenedRef.current === currentBooking.id) {
        paymentDialogAutoOpenedRef.current = null;
      }
    }
  }, [isRenter, currentBooking.id, currentBooking.status, currentBooking.paymentStatus, currentBooking.razorpayPaymentId, currentBooking.paymentMode, currentBooking.paymentMethod, showPaymentMethodDialog]);

  // Removed automatic return OTP generation - owner will manually generate when needed

  const getStatusBadge = () => {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-500",
      pickup_otp_generated: "bg-blue-500",
      picked_up: "bg-green-500",
      return_otp_generated: "bg-blue-500",
      returned: "bg-green-500",
      completed: "bg-gray-500",
      active: "bg-green-500",
      cancelled: "bg-red-500",
      disputed: "bg-orange-500",
    };

    return (
      <Badge className={statusColors[currentBooking.status] || "bg-gray-500"}>
        {currentBooking.status.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  };

  const handlePickupSuccess = () => {
    console.log('handlePickupSuccess called, isRenter:', isRenter);
    setShowPickupConfirmation(false);
    // After pickup is confirmed, show payment method dialog for renter immediately
    if (isRenter) {
      console.log('Showing payment method dialog for renter');
      // Show dialog immediately, don't wait
      setShowPaymentMethodDialog(true);
    }
    // Update status in background
    onStatusUpdate?.();
  };

  const handleReturnSuccess = async () => {
    setShowReturnConfirmation(false);
    // Refresh the booking to get updated status
    try {
      const updated = await getTransaction(booking.id);
      if (updated) {
        setCurrentBooking(updated);
      }
    } catch (error) {
      console.error('Error refreshing booking after return:', error);
    }
    // Mark as completed after return
    onStatusUpdate?.();
  };

  const handleRefresh = async () => {
    try {
      const updated = await getTransaction(booking.id);
      if (updated) {
        console.log('Manual refresh - updated booking:', {
          id: updated.id,
          status: updated.status,
          pickupOtp: updated.pickupOtp
        });
        setCurrentBooking(updated);
        toast({
          title: "Refreshed",
          description: "Booking details have been updated.",
        });
      }
    } catch (error) {
      console.error('Error refreshing:', error);
      toast({
        title: "Error",
        description: "Failed to refresh booking details.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Booking Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle>Booking Details</CardTitle>
              <CardDescription>{listingTitle || currentBooking.listingTitle}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                className="text-xs"
              >
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Renter</p>
                <p className="font-medium">{renter?.name || "Unknown"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-medium">₹{currentBooking.amount?.toLocaleString() || currentBooking.totalRent?.toLocaleString()}</p>
              </div>
            </div>
            {currentBooking.startDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">
                    {format(
                      currentBooking.startDate.toDate ? currentBooking.startDate.toDate() : new Date(currentBooking.startDate),
                      "MMM dd, yyyy"
                    )}
                  </p>
                </div>
              </div>
            )}
            {currentBooking.endDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium">
                    {format(
                      currentBooking.endDate.toDate ? currentBooking.endDate.toDate() : new Date(currentBooking.endDate),
                      "MMM dd, yyyy"
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pickup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pickup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Debug info - remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
              <p>Status: {currentBooking.status}</p>
              <p>Has OTP: {currentBooking.pickupOtp ? 'Yes' : 'No'}</p>
              <p>OTP Value: {currentBooking.pickupOtp || 'None'}</p>
            </div>
          )}
          
          {/* Show OTP entry ONLY when status is pickup_otp_generated (not after pickup) */}
          {currentBooking.pickupOtp && 
           (currentBooking.status === 'pickup_otp_generated' || currentBooking.status === 'PICKUP_OTP_GENERATED') && (
            <>
              {isOwner && (
                <>
                  <OtpDisplay
                    otp={currentBooking.pickupOtp}
                    title="Share This OTP with Renter"
                    description="Tell the renter this code when they come to collect the item. They will enter it in their app."
                    expiresAt={currentBooking.pickupOtpExpiresAt?.toDate ? currentBooking.pickupOtpExpiresAt.toDate() : undefined}
                  />
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      📱 The renter will enter this OTP in their app to confirm pickup. Payment will be processed automatically after they verify the OTP.
                    </p>
                  </div>
                </>
              )}
              {isRenter && (
                  <>
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-sm text-amber-900 dark:text-amber-100">
                        <strong>Ready to collect the item?</strong><br />
                        Ask the owner for the 6-digit pickup OTP and enter it below. Payment will be processed after you verify the OTP.
                      </p>
                    </div>
                    {!showPickupConfirmation ? (
                      <Button 
                        onClick={() => {
                          console.log('Renter clicked Enter Pickup OTP button');
                          console.log('onPaymentRequired callback exists:', !!onPaymentRequired);
                          setShowPickupConfirmation(true);
                        }} 
                        className="w-full bg-green-600 hover:bg-green-700" 
                        size="lg"
                      >
                        <CheckCircle className="mr-2 h-5 w-5" />
                        Enter Pickup OTP & Pay
                      </Button>
                    ) : (
                      <OtpConfirmation
                        transactionId={currentBooking.id}
                        stage="pickup"
                        onSuccess={handlePickupSuccess}
                        onCancel={() => setShowPickupConfirmation(false)}
                        onPaymentRequired={onPaymentRequired}
                      />
                    )}
                  </>
              )}
            </>
          )}
          {currentBooking.status === 'picked_up' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <p>Pickup confirmed on {currentBooking.pickupConfirmedAt ? format(currentBooking.pickupConfirmedAt.toDate ? currentBooking.pickupConfirmedAt.toDate() : new Date(currentBooking.pickupConfirmedAt), "MMM dd, yyyy 'at' h:mm a") : "N/A"}</p>
              </div>
              {/* Show payment option if payment not completed and not already set to offline */}
              {isRenter && 
               currentBooking.paymentStatus !== 'completed' && 
               !currentBooking.razorpayPaymentId && 
               currentBooking.paymentMode !== 'offline' &&
               currentBooking.paymentMethod !== 'cash_on_delivery' && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-900 dark:text-amber-100 mb-3">
                    ⚠️ <strong>Payment Required:</strong> Please complete payment to proceed with the rental.
                  </p>
                  <Button 
                    onClick={() => {
                      console.log('Payment button clicked for transaction:', currentBooking.id);
                      setShowPaymentMethodDialog(true);
                    }}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <DollarSign className="mr-2 h-5 w-5" />
                    Complete Payment Now
                  </Button>
                </div>
              )}
              {/* Show payment success if payment is completed */}
              {isRenter && (currentBooking.paymentStatus === 'completed' || currentBooking.razorpayPaymentId) && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-900 dark:text-green-100">
                    ✅ <strong>Payment Completed:</strong> Your payment has been processed successfully.
                  </p>
                </div>
              )}
            </div>
          )}
          {/* Show waiting message only if OTP doesn't exist and status is pending/active */}
          {!currentBooking.pickupOtp && 
           (currentBooking.status === 'pending' || 
            currentBooking.status === 'PENDING' || 
            currentBooking.status === 'active' || 
            currentBooking.status === 'ACTIVE') && (
            <div className="space-y-3">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {isRenter ? (
                    <>⏳ Waiting for pickup OTP to be generated... The owner needs to generate the OTP.</>
                  ) : isOwner && currentBooking.status === 'pending' ? (
                    <>⏳ Waiting for pickup OTP to be generated... Click the button below to approve and generate the OTP.</>
                  ) : isOwner && (currentBooking.status === 'active' || currentBooking.status === 'ACTIVE') ? (
                    <>⚠️ This booking was approved before the OTP system. Click below to generate an OTP now.</>
                  ) : (
                    <>⏳ Waiting for pickup OTP to be generated...</>
                  )}
                </p>
              </div>
              {isOwner && onApprove && (currentBooking.status === 'pending' || currentBooking.status === 'PENDING') && (
                <Button 
                  onClick={onApprove} 
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                  size="lg"
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Approve Booking & Generate OTP
                </Button>
              )}
              {isOwner && (currentBooking.status === 'active' || currentBooking.status === 'ACTIVE') && (
                <Button 
                  onClick={async () => {
                    try {
                      await generatePickupOtp(currentBooking.id);
                      toast({
                        title: "OTP Generated",
                        description: "Pickup OTP has been generated successfully.",
                      });
                      onStatusUpdate?.();
                    } catch (error: any) {
                      toast({
                        title: "Error",
                        description: error.message || "Failed to generate OTP.",
                        variant: "destructive",
                      });
                    }
                  }} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  size="lg"
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Generate Pickup OTP
                </Button>
              )}
            </div>
          )}
          
          {/* Show error message if status is pickup_otp_generated but OTP is missing */}
          {(currentBooking.status === 'pickup_otp_generated' || currentBooking.status === 'PICKUP_OTP_GENERATED') && 
           !currentBooking.pickupOtp && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">
                ⚠️ OTP generation in progress... Please wait a moment or refresh the page.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Return Section - Show after pickup is completed (payment can be pending for offline) */}
      {/* Always show if status is return_otp_generated or returned, otherwise require payment completion */}
      {((currentBooking.status === 'return_otp_generated' || currentBooking.status === 'returned') ||
        ((currentBooking.status === 'picked_up') && 
         (currentBooking.paymentStatus === 'completed' || 
          currentBooking.razorpayPaymentId || 
          currentBooking.paymentMode === 'offline' ||
          currentBooking.paymentMethod === 'cash_on_delivery'))) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Return
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Renter: Show OTP display when returnOtp exists */}
            {isRenter && currentBooking.returnOtp && (
              <>
                <OtpDisplay
                  otp={currentBooking.returnOtp}
                  title="Your Return OTP"
                  description="Share this OTP with the owner when you return the item. They will enter it to confirm the return."
                  expiresAt={currentBooking.returnOtpExpiresAt?.toDate ? currentBooking.returnOtpExpiresAt.toDate() : undefined}
                />
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    📱 Share this OTP with the owner when you return the item. The owner will enter it to confirm the return.
                  </p>
                </div>
              </>
            )}
            
            {/* Owner: Show "Enter Return OTP" option when status is return_otp_generated (but not returned) */}
            {isOwner && currentBooking.status === 'return_otp_generated' && currentBooking.status !== 'returned' && (
              <>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    <strong>Ready to receive the item?</strong><br />
                    Ask the renter for the 6-digit return OTP and enter it below to confirm return.
                  </p>
                </div>
                {!showReturnConfirmation ? (
                  <Button onClick={() => setShowReturnConfirmation(true)} className="w-full bg-green-600 hover:bg-green-700" size="lg">
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Enter Return OTP
                  </Button>
                ) : (
                  <OtpConfirmation
                    transactionId={currentBooking.id}
                    stage="return"
                    onSuccess={handleReturnSuccess}
                    onCancel={() => setShowReturnConfirmation(false)}
                  />
                )}
              </>
            )}
            {currentBooking.status === 'picked_up' && 
             (currentBooking.paymentStatus === 'completed' || 
              currentBooking.razorpayPaymentId || 
              currentBooking.paymentMode === 'offline' ||
              currentBooking.paymentMethod === 'cash_on_delivery') &&
             !currentBooking.returnOtp && (
              <div className="space-y-3">
                {isRenter && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      ⏳ Waiting for return OTP to be generated. The owner will generate it when you're ready to return the item.
                    </p>
                  </div>
                )}
                {isOwner && (
                  <>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        📱 Generate a return OTP when the renter is ready to return the item. The renter will share this OTP with you to confirm the return.
                      </p>
                    </div>
                    <Button 
                      onClick={async () => {
                        setIsGeneratingReturnOtp(true);
                        try {
                          await generateReturnOtp(currentBooking.id);
                          toast({
                            title: "Return OTP Generated",
                            description: "Return OTP has been generated and sent to both parties via email.",
                          });
                          onStatusUpdate?.();
                        } catch (error: any) {
                          toast({
                            title: "Error",
                            description: error.message || "Failed to generate return OTP. Please try again.",
                            variant: "destructive",
                          });
                        } finally {
                          setIsGeneratingReturnOtp(false);
                        }
                      }}
                      disabled={isGeneratingReturnOtp}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                      size="lg"
                    >
                      <CheckCircle className="mr-2 h-5 w-5" />
                      {isGeneratingReturnOtp ? "Generating..." : "Generate Return OTP"}
                    </Button>
                  </>
                )}
              </div>
            )}
            {currentBooking.status === 'returned' && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <p>Return confirmed on {currentBooking.returnConfirmedAt ? format(currentBooking.returnConfirmedAt.toDate ? currentBooking.returnConfirmedAt.toDate() : new Date(currentBooking.returnConfirmedAt), "MMM dd, yyyy 'at' h:mm a") : "N/A"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Method Selection Dialog */}
      <Dialog open={showPaymentMethodDialog} onOpenChange={(open) => {
        console.log('Payment method dialog open state changed:', open);
        setShowPaymentMethodDialog(open);
        // If dialog is closed without payment completion, allow it to reopen
        if (!open && paymentDialogAutoOpenedRef.current === currentBooking.id) {
          // Only reset if payment is still not completed
          if (currentBooking.paymentStatus !== 'completed' && !currentBooking.razorpayPaymentId) {
            paymentDialogAutoOpenedRef.current = null;
          }
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Payment Method</DialogTitle>
            <DialogDescription>
              Choose how you would like to pay for this rental.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button
              variant={selectedPaymentMethod === 'online' ? 'default' : 'outline'}
              className="w-full justify-start h-auto p-4"
              onClick={() => setSelectedPaymentMethod('online')}
            >
              <div className="flex items-center gap-3 w-full">
                <CreditCard className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Online Payment</div>
                  <div className="text-sm text-muted-foreground">Pay securely via Razorpay</div>
                </div>
                {selectedPaymentMethod === 'online' && <CheckCircle className="h-5 w-5 flex-shrink-0" />}
              </div>
            </Button>
            <Button
              variant={selectedPaymentMethod === 'offline' ? 'default' : 'outline'}
              className="w-full justify-start h-auto p-4"
              onClick={() => setSelectedPaymentMethod('offline')}
            >
              <div className="flex items-center gap-3 w-full">
                <Banknote className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Cash on Delivery</div>
                  <div className="text-sm text-muted-foreground">Pay when you receive the item</div>
                </div>
                {selectedPaymentMethod === 'offline' && <CheckCircle className="h-5 w-5 flex-shrink-0" />}
              </div>
            </Button>
            {selectedPaymentMethod === 'offline' && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">Note:</p>
                <p>For cash on delivery, payment will be collected when you receive the item. The service fee will be included in the total amount.</p>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentMethodDialog(false);
                  setSelectedPaymentMethod(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedPaymentMethod) {
                    toast({
                      title: "Please select a payment method",
                      variant: "destructive",
                    });
                    return;
                  }

                  try {
                    if (selectedPaymentMethod === 'offline') {
                      // Handle offline payment
                      console.log('Setting offline payment for transaction:', currentBooking.id);
                      await updateTransaction(currentBooking.id, {
                        paymentMode: 'offline',
                        paymentStatus: 'pending',
                        paymentMethod: 'cash_on_delivery',
                      });

                      // Auto-generate return OTP for offline payment too
                      try {
                        await generateReturnOtp(currentBooking.id);
                        console.log('Return OTP generated automatically for offline payment');
                      } catch (error) {
                        console.error('Error generating return OTP:', error);
                      }

                      console.log('Offline payment set successfully');

                      toast({
                        title: "Payment Method Selected",
                        description: "Cash on delivery selected. Return OTP has been generated. Payment will be collected when you receive the item.",
                      });

                      setShowPaymentMethodDialog(false);
                      setSelectedPaymentMethod(null);
                      
                      // Refresh the booking to show return section
                      await onStatusUpdate?.();
                      
                      // Also manually refresh currentBooking to ensure UI updates
                      setTimeout(async () => {
                        const updated = await getTransaction(currentBooking.id);
                        if (updated) {
                          console.log('Updated booking after offline payment:', {
                            id: updated.id,
                            status: updated.status,
                            paymentMode: updated.paymentMode,
                            paymentMethod: updated.paymentMethod,
                            paymentStatus: updated.paymentStatus
                          });
                          setCurrentBooking(updated);
                        }
                      }, 1000);
                    } else {
                      // Handle online payment - trigger Razorpay
                      setShowPaymentMethodDialog(false);
                      setSelectedPaymentMethod(null);
                      if (onPaymentRequired) {
                        onPaymentRequired(currentBooking.id);
                      }
                    }
                  } catch (error: any) {
                    console.error('Error updating payment method:', error);
                    toast({
                      title: "Error",
                      description: error.message || "Failed to update payment method. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
                disabled={!selectedPaymentMethod}
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

