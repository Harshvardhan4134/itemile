import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { confirmPickupOtp } from "@/lib/firestore";
import { auth } from "@/lib/firebase";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";

interface RenterOtpEntryProps {
  transactionId: string;
  onSuccess: () => void;
  onPaymentRequired: (transactionId: string) => void;
}

export const RenterOtpEntry = ({ transactionId, onSuccess, onPaymentRequired }: RenterOtpEntryProps) => {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a 6-digit OTP code.",
        variant: "destructive",
      });
      return;
    }

    if (!auth.currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to verify OTP.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      // Verify the OTP - this will mark pickup as confirmed
      const isValid = await confirmPickupOtp(transactionId, otp, auth.currentUser.uid);
      
      if (isValid) {
        toast({
          title: "OTP Verified!",
          description: "Pickup confirmed. Processing payment now...",
        });
        
        // Trigger payment after successful OTP verification
        onPaymentRequired(transactionId);
        onSuccess();
      } else {
        toast({
          title: "Invalid OTP",
          description: "The OTP you entered is incorrect. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to verify OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Enter Pickup OTP
        </CardTitle>
        <CardDescription>
          The owner will give you a 6-digit code. Enter it below to confirm pickup and proceed to payment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">OTP Code</Label>
            <Input
              id="otp"
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="text-3xl text-center tracking-[1em] font-mono font-bold"
              disabled={isVerifying}
            />
            <p className="text-xs text-muted-foreground">
              Ask the owner for the pickup code
            </p>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-semibold mb-1">Important:</p>
                <p>Only enter the OTP after you've received the item from the owner. Payment will be processed immediately after OTP verification.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1"
              disabled={isVerifying || otp.length !== 6}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Verify OTP & Proceed to Payment
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

