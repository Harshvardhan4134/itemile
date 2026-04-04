import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { verifyAccessCode, grantUserAccess, incrementAccessCodeUsage } from '@/lib/firestore';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AccessCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccessGranted: () => void;
}

const AccessCodeDialog: React.FC<AccessCodeDialogProps> = ({
  open,
  onOpenChange,
  onAccessGranted,
}) => {
  const [accessCode, setAccessCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessCode.trim()) {
      setError('Please enter an access code');
      return;
    }

    if (!auth.currentUser) {
      setError('You must be logged in to verify access code');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      // Verify the access code
      const isValid = await verifyAccessCode(accessCode.trim());
      
      if (!isValid) {
        setError('Invalid access code. Please check and try again.');
        setVerifying(false);
        return;
      }

      // Grant access to the user
      await grantUserAccess(auth.currentUser.uid);
      
      // Increment access code usage
      await incrementAccessCodeUsage(accessCode.trim());
      
      // Store in localStorage to avoid re-checking on every page load
      localStorage.setItem(`access_granted_${auth.currentUser.uid}`, 'true');
      
      toast({
        title: "Access granted!",
        description: "Welcome to Lendlly! You now have full access to the platform.",
      });

      onAccessGranted();
      onOpenChange(false);
      setAccessCode('');
    } catch (error: any) {
      console.error('Error verifying access code:', error);
      setError(error.message || 'Failed to verify access code. Please try again.');
      setVerifying(false);
    }
  };

  const handleSkip = () => {
    // Don't allow skipping - user must enter access code
    setError('Access code is required to use Lendlly');
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      // Prevent closing the dialog without entering access code
      if (!open) {
        handleSkip();
      } else {
        onOpenChange(open);
      }
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <Lock className="w-6 h-6 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center">Enter Access Code</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Lendlly is currently in early access. Please enter your access code to continue.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accessCode">Access Code</Label>
            <Input
              id="accessCode"
              type="text"
              placeholder="Enter your access code"
              value={accessCode}
              onChange={(e) => {
                setAccessCode(e.target.value);
                setError('');
              }}
              disabled={verifying}
              autoFocus
              className="text-center text-lg tracking-widest font-mono"
            />
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              type="submit"
              disabled={verifying || !accessCode.trim()}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90"
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Verify Access
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
        <div className="text-center text-xs text-muted-foreground mt-2">
          Don't have an access code? Contact us to join the waitlist.
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccessCodeDialog;

