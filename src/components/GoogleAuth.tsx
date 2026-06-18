import { useState, useRef } from 'react';
import {
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  getAdditionalUserInfo,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  createUser,
  getUser,
  applyReferralCodeIfEligible,
} from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Gift } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GoogleAuthProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  children?: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  /** Applied when creating the Firestore profile at Google sign-in */
  pendingReferralCode?: string;
  /**
   * Login/signup screens: always show the Google sign-in button.
   * Otherwise a leftover Firebase session shows "Sign Out" here, which is confusing.
   */
  forLoginPage?: boolean;
}

const GoogleAuth: React.FC<GoogleAuthProps> = ({
  onSuccess,
  onError,
  children,
  variant = 'default',
  size = 'default',
  className = '',
  pendingReferralCode,
  forLoginPage = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [referralInput, setReferralInput] = useState('');
  const [referralSaving, setReferralSaving] = useState(false);
  const [newUserUid, setNewUserUid] = useState<string | null>(null);
  const authFlowFinishedRef = useRef(false);
  const { toast } = useToast();

  const finishAuthFlow = () => {
    if (authFlowFinishedRef.current) return;
    authFlowFinishedRef.current = true;
    setReferralDialogOpen(false);
    setReferralInput('');
    setNewUserUid(null);
    onSuccess?.();
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      authFlowFinishedRef.current = false;

      const provider = new GoogleAuthProvider();
      const clientId = import.meta.env.VITE_FIREBASE_GOOGLE_CLIENT_ID;

      if (clientId) {
        provider.setCustomParameters({
          client_id: clientId,
          prompt: 'select_account',
        });
      }

      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const additionalInfo = getAdditionalUserInfo(result);
      const isFirebaseNewUser = additionalInfo?.isNewUser === true;

      await auth.authStateReady();
      await user.getIdToken(true);

      await createUser({
        uid: user.uid,
        name: user.displayName || 'Unknown User',
        email: user.email || '',
        phone: user.phoneNumber || '',
        verified: false,
        wallet: 0,
        rating: 0,
        ...(pendingReferralCode?.trim()
          ? { pendingReferralCode: pendingReferralCode.trim() }
          : {}),
      });

      const profile = await getUser(user.uid);
      const hasReferrer = !!profile?.referredByUid;
      const cameFromSignupFormWithCode = !!pendingReferralCode?.trim();

      const shouldOfferReferralPrompt =
        isFirebaseNewUser &&
        !hasReferrer &&
        !cameFromSignupFormWithCode;

      if (shouldOfferReferralPrompt) {
        setNewUserUid(user.uid);
        setReferralDialogOpen(true);
        toast({
          title: 'Welcome!',
          description: 'Your account is ready. Add a referral code if someone invited you.',
        });
      } else {
        if (profile && profile.createdAt) {
          toast({
            title: 'Welcome back!',
            description: "You've been signed in successfully.",
          });
        } else {
          toast({
            title: 'Welcome!',
            description: 'Your account has been created successfully.',
          });
        }
        finishAuthFlow();
      }
    } catch (error: unknown) {
      console.error('Google sign-in error:', error);
      const err = error as { code?: string; message?: string };

      let errorMessage = 'Failed to sign in with Google';

      if (err.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled';
      } else if (err.code === 'auth/popup-blocked') {
        errorMessage =
          'Popup was blocked by browser. Please allow popups and try again.';
      } else if (err.code === 'auth/unauthorized-domain') {
        errorMessage = 'This domain is not authorized for Google sign-in';
      } else if (
        err.code === 'permission-denied' ||
        `${err.message || ''}`.includes('Missing or insufficient permissions')
      ) {
        errorMessage =
          'Could not save your profile. If this persists, confirm Firestore rules are deployed and your domain is authorized in Firebase.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      onError?.(errorMessage);
      toast({
        title: 'Sign-in failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReferralSkip = () => {
    finishAuthFlow();
  };

  const handleReferralSubmit = async () => {
    const uid = newUserUid;
    if (!uid) return;
    const raw = referralInput.trim();
    if (!raw) {
      toast({
        title: 'Enter a code or skip',
        description: 'Type a referral code, or tap Skip if you were not referred.',
        variant: 'destructive',
      });
      return;
    }

    setReferralSaving(true);
    try {
      const res = await applyReferralCodeIfEligible(uid, raw);
      if (res.ok) {
        toast({
          title: 'Referral saved',
          description: 'Thanks — your referrer has been linked to your account.',
        });
        finishAuthFlow();
      } else if (res.reason === 'already_referred') {
        toast({ title: 'Already set', description: 'A referrer is already linked.' });
        finishAuthFlow();
      } else if (res.reason === 'invalid_code') {
        toast({
          title: 'Invalid code',
          description: 'That referral code was not found. Check and try again, or skip.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Could not apply code',
          description: 'Try again or skip for now.',
          variant: 'destructive',
        });
      }
    } catch (e) {
      console.error(e);
      toast({
        title: 'Something went wrong',
        description: 'Could not save the referral code. You can try again from support later.',
        variant: 'destructive',
      });
    } finally {
      setReferralSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({
        title: 'Signed out',
        description: "You've been signed out successfully.",
      });
    } catch (error: unknown) {
      console.error('Sign-out error:', error);
      toast({
        title: 'Sign-out failed',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (auth.currentUser && !forLoginPage) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleSignOut}
        className={className}
      >
        Sign Out
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleGoogleSignIn}
        disabled={loading}
        className={className}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Signing in...
          </>
        ) : (
          children || 'Sign in with Google'
        )}
      </Button>

      <Dialog
        open={referralDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleReferralSkip();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Were you referred?
            </DialogTitle>
            <DialogDescription>
              If someone shared Itemile with you, enter their referral code once. You can skip
              if you do not have one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="google-referral-code">Referral code (optional)</Label>
            <Input
              id="google-referral-code"
              placeholder="e.g. CXJ6NT8S"
              value={referralInput}
              onChange={(e) => setReferralInput(e.target.value)}
              autoComplete="off"
              className="font-mono uppercase"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={handleReferralSkip}
              disabled={referralSaving}
            >
              Skip
            </Button>
            <Button
              type="button"
              onClick={handleReferralSubmit}
              disabled={referralSaving || !referralInput.trim()}
            >
              {referralSaving ? 'Saving…' : 'Apply code'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GoogleAuth;
