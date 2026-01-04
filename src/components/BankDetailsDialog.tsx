import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Wallet, AlertCircle, CheckCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateUser, User } from "@/lib/firestore";
import { auth } from "@/lib/firebase";
import { 
  encryptSensitiveData, 
  isValidUPI, 
  isValidIFSC, 
  isValidAccountNumber 
} from "@/lib/encryption";

interface BankDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onUpdate?: () => void;
}

export default function BankDetailsDialog({
  open,
  onOpenChange,
  user,
  onUpdate,
}: BankDetailsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<'upi' | 'bank_account'>('upi');
  const [formData, setFormData] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
    bankName: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user?.payoutDetails) {
      const details = user.payoutDetails;
      setPayoutMethod(details.payoutMethod || 'upi');
      // Note: In production, decrypt these fields via Firebase Function
      // For now, we'll just show empty form if data exists (encrypted)
      if (details.accountHolderName) {
        // In production, decrypt here
        setFormData({
          accountHolderName: details.accountHolderName || '',
          accountNumber: details.accountNumber || '',
          ifscCode: details.ifscCode || '',
          upiId: details.upiId || '',
          bankName: details.bankName || '',
          phone: details.phone || user.phone || '',
        });
      }
    } else {
      // Pre-fill phone from user profile
      setFormData(prev => ({
        ...prev,
        phone: user?.phone || '',
      }));
    }
  }, [user, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (formData.phone.length < 10) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (payoutMethod === 'upi') {
      if (!formData.upiId.trim()) {
        newErrors.upiId = 'UPI ID is required';
      } else if (!isValidUPI(formData.upiId)) {
        newErrors.upiId = 'Please enter a valid UPI ID (e.g., name@paytm)';
      }
    } else {
      if (!formData.accountNumber.trim()) {
        newErrors.accountNumber = 'Account number is required';
      } else if (!isValidAccountNumber(formData.accountNumber)) {
        newErrors.accountNumber = 'Please enter a valid account number (9-18 digits)';
      }

      if (!formData.ifscCode.trim()) {
        newErrors.ifscCode = 'IFSC code is required';
      } else if (!isValidIFSC(formData.ifscCode.toUpperCase())) {
        newErrors.ifscCode = 'Please enter a valid IFSC code (e.g., SBIN0001234)';
      }

      if (!formData.bankName.trim()) {
        newErrors.bankName = 'Bank name is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!auth.currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to update bank details",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Encrypt sensitive data
      // Note: In production, this should be done via Firebase Function
      const encryptedDetails = {
        accountHolderName: encryptSensitiveData(formData.accountHolderName.trim()),
        accountNumber: payoutMethod === 'bank_account' 
          ? encryptSensitiveData(formData.accountNumber.trim()) 
          : undefined,
        ifscCode: payoutMethod === 'bank_account' 
          ? encryptSensitiveData(formData.ifscCode.trim().toUpperCase()) 
          : undefined,
        upiId: payoutMethod === 'upi' 
          ? encryptSensitiveData(formData.upiId.trim().toLowerCase()) 
          : undefined,
        bankName: payoutMethod === 'bank_account' 
          ? encryptSensitiveData(formData.bankName.trim()) 
          : undefined,
        phone: encryptSensitiveData(formData.phone.trim()),
        payoutMethod,
        lastUpdated: new Date(),
        payoutReferences: user?.payoutDetails?.payoutReferences || [],
      };

      await updateUser(auth.currentUser.uid, {
        payoutDetails: encryptedDetails,
      });

      toast({
        title: "Success",
        description: "Bank details updated successfully. Your payout information is secure.",
      });

      onUpdate?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating bank details:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update bank details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Add Bank Details for Payouts</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Add your bank account or UPI details to receive rental payments. All information is encrypted and secure.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Security Notice */}
          <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs sm:text-sm">
              Your bank details are encrypted and only accessible to you and platform administrators for payout processing.
            </AlertDescription>
          </Alert>

          {/* Payout Method Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Payout Method</Label>
            <RadioGroup value={payoutMethod} onValueChange={(value) => setPayoutMethod(value as 'upi' | 'bank_account')}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                <RadioGroupItem value="upi" id="upi" />
                <Label htmlFor="upi" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    <div>
                      <div className="font-medium">UPI</div>
                      <div className="text-xs text-muted-foreground">Faster payouts via UPI</div>
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                <RadioGroupItem value="bank_account" id="bank_account" />
                <Label htmlFor="bank_account" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Bank Account</div>
                      <div className="text-xs text-muted-foreground">Direct bank transfer (IMPS/NEFT)</div>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Common Fields */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="accountHolderName">
                Account Holder Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="accountHolderName"
                value={formData.accountHolderName}
                onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                placeholder="Enter account holder name"
                className={errors.accountHolderName ? "border-red-500" : ""}
              />
              {errors.accountHolderName && (
                <p className="text-xs text-red-500">{errors.accountHolderName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
                className={errors.phone ? "border-red-500" : ""}
              />
              {errors.phone && (
                <p className="text-xs text-red-500">{errors.phone}</p>
              )}
            </div>

            {/* UPI Fields */}
            {payoutMethod === 'upi' && (
              <div className="space-y-2">
                <Label htmlFor="upiId">
                  UPI ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="upiId"
                  value={formData.upiId}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value.toLowerCase() })}
                  placeholder="name@paytm or name@ybl"
                  className={errors.upiId ? "border-red-500" : ""}
                />
                {errors.upiId && (
                  <p className="text-xs text-red-500">{errors.upiId}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Example: yourname@paytm, yourname@ybl, yourname@phonepe
                </p>
              </div>
            )}

            {/* Bank Account Fields */}
            {payoutMethod === 'bank_account' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">
                    Account Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="accountNumber"
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value.replace(/\D/g, '') })}
                    placeholder="Enter account number"
                    className={errors.accountNumber ? "border-red-500" : ""}
                  />
                  {errors.accountNumber && (
                    <p className="text-xs text-red-500">{errors.accountNumber}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ifscCode">
                    IFSC Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="ifscCode"
                    value={formData.ifscCode}
                    onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                    placeholder="SBIN0001234"
                    className={errors.ifscCode ? "border-red-500" : ""}
                    maxLength={11}
                  />
                  {errors.ifscCode && (
                    <p className="text-xs text-red-500">{errors.ifscCode}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankName">
                    Bank Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="Enter bank name"
                    className={errors.bankName ? "border-red-500" : ""}
                  />
                  {errors.bankName && (
                    <p className="text-xs text-red-500">{errors.bankName}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Bank Details'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

