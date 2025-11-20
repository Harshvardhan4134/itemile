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
import { AlertCircle, CheckCircle, CreditCard, Wallet, Banknote, QrCode, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { BookingData } from "./TenureSelector";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingData: BookingData | null;
  listingTitle: string;
  onPaymentComplete: (paymentMethod: 'SecurePay' | 'online' | 'offline' | 'phonepe') => Promise<void>;
  isProcessing?: boolean;
}

// PhonePe UPI ID - Replace with your actual PhonePe UPI ID
// Format: yourname@ybl or yourname@paytm
const PHONEPE_UPI_ID = import.meta.env.VITE_PHONEPE_UPI_ID || "gharsha238@ybl";

export default function PaymentDialog({
  open,
  onOpenChange,
  bookingData,
  listingTitle,
  onPaymentComplete,
  isProcessing = false,
}: PaymentDialogProps) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'SecurePay' | 'online' | 'offline' | 'phonepe'>('phonepe');
  const [showQRCode, setShowQRCode] = useState(true); // Default to true since phonepe is default
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [qrSize, setQrSize] = useState(200);

  useEffect(() => {
    const updateQrSize = () => {
      setQrSize(window.innerWidth < 640 ? 180 : 200);
    };
    updateQrSize();
    window.addEventListener('resize', updateQrSize);
    return () => window.removeEventListener('resize', updateQrSize);
  }, []);

  if (!bookingData) return null;

  // Generate UPI payment string for PhonePe
  const upiPaymentString = `upi://pay?pa=${PHONEPE_UPI_ID}&pn=RentShare&am=${bookingData.payableNow}&cu=INR&tn=Payment for ${listingTitle}`;

  const handlePaymentMethodSelect = (method: 'SecurePay' | 'online' | 'offline' | 'phonepe') => {
    setSelectedPaymentMethod(method);
    setShowQRCode(method === 'phonepe');
    setPaymentConfirmed(false);
  };

  const handlePayment = async () => {
    // If SecurePay is required, only allow SecurePay
    const paymentMethod = bookingData.requiresSecurePay ? 'SecurePay' : selectedPaymentMethod;
    await onPaymentComplete(paymentMethod);
  };

  const handlePaymentConfirmation = async () => {
    setPaymentConfirmed(true);
    // Wait a moment for user to see confirmation, then process
    setTimeout(() => {
      handlePayment();
    }, 500);
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
                  variant={selectedPaymentMethod === 'phonepe' ? 'default' : 'outline'}
                  className="w-full justify-start h-auto p-3 sm:p-4"
                  onClick={() => handlePaymentMethodSelect('phonepe')}
                  disabled={isProcessing}
                >
                  <div className="flex items-center gap-2 sm:gap-3 w-full">
                    <QrCode className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium text-xs sm:text-sm">PhonePe QR Code</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground truncate">Scan QR code to pay instantly</div>
                    </div>
                    {selectedPaymentMethod === 'phonepe' && <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />}
                  </div>
                </Button>
                <Button
                  variant={selectedPaymentMethod === 'SecurePay' ? 'default' : 'outline'}
                  className="w-full justify-start h-auto p-3 sm:p-4"
                  onClick={() => handlePaymentMethodSelect('SecurePay')}
                  disabled={isProcessing}
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
                  variant={selectedPaymentMethod === 'online' ? 'default' : 'outline'}
                  className="w-full justify-start h-auto p-3 sm:p-4"
                  onClick={() => handlePaymentMethodSelect('online')}
                  disabled={isProcessing}
                >
                  <div className="flex items-center gap-2 sm:gap-3 w-full">
                    <Wallet className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium text-xs sm:text-sm">Online Payment</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground truncate">UPI, Cards, Net Banking</div>
                    </div>
                    {selectedPaymentMethod === 'online' && <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />}
                  </div>
                </Button>
                <Button
                  variant={selectedPaymentMethod === 'offline' ? 'default' : 'outline'}
                  className="w-full justify-start h-auto p-3 sm:p-4"
                  onClick={() => handlePaymentMethodSelect('offline')}
                  disabled={isProcessing}
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
              </div>
            </div>
          )}

          {/* PhonePe QR Code Display */}
          {showQRCode && selectedPaymentMethod === 'phonepe' && (
            <Card className="border-2 border-primary">
              <CardContent className="p-3 sm:p-6 space-y-3 sm:space-y-4">
                <div className="text-center space-y-1 sm:space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <h3 className="font-semibold text-base sm:text-lg">Scan to Pay with PhonePe</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Open PhonePe app and scan this QR code
                  </p>
                </div>
                
                <div className="flex justify-center p-2 sm:p-4 bg-white rounded-lg">
                  <QRCodeSVG
                    value={upiPaymentString}
                    size={qrSize}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <div className="space-y-1 sm:space-y-2 text-center">
                  <div className="text-xs sm:text-sm font-medium">
                    Amount: ₹{bookingData.payableNow.toLocaleString()}
                  </div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground break-all">
                    UPI ID: {PHONEPE_UPI_ID}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-start gap-2 p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-[10px] sm:text-xs">
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-blue-800 dark:text-blue-200">
                      <div className="font-medium mb-1">Payment Instructions:</div>
                      <ol className="list-decimal list-inside space-y-0.5 sm:space-y-1">
                        <li>Open PhonePe app on your phone</li>
                        <li>Tap on "Scan & Pay"</li>
                        <li>Scan this QR code</li>
                        <li>Enter the amount: ₹{bookingData.payableNow.toLocaleString()}</li>
                        <li>Complete the payment</li>
                        <li>Click "I've Paid" below after successful payment</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {!paymentConfirmed ? (
                  <Button
                    className="w-full text-xs sm:text-sm"
                    onClick={handlePaymentConfirmation}
                    disabled={isProcessing}
                    size="lg"
                  >
                    <CheckCircle className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    I've Paid - Confirm Payment
                  </Button>
                ) : (
                  <Button
                    className="w-full text-xs sm:text-sm"
                    disabled
                    size="lg"
                    variant="outline"
                  >
                    <CheckCircle className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Processing Payment...
                  </Button>
                )}
              </CardContent>
            </Card>
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

          {/* Payment Button - Only show if not PhonePe (PhonePe has its own button) */}
          {selectedPaymentMethod !== 'phonepe' && (
            <Button
              className="w-full text-xs sm:text-sm"
              onClick={handlePayment}
              disabled={isProcessing}
              size="lg"
            >
              {isProcessing ? (
                'Processing Payment...'
              ) : (
                <>
                  <CreditCard className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Pay ₹{bookingData.payableNow.toLocaleString()}
                </>
              )}
            </Button>
          )}

          <p className="text-[10px] sm:text-xs text-center text-muted-foreground px-2">
            By completing payment, you agree to our terms and conditions
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

