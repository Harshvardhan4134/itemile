import { useState } from 'react';
import { signInWithPopup, signOut, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUser, getUser } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface GoogleAuthProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  children?: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  /** Applied only when a new Firestore user is created at Google sign-in */
  pendingReferralCode?: string;
}

const GoogleAuth: React.FC<GoogleAuthProps> = ({ 
  onSuccess, 
  onError, 
  children,
  variant = 'default',
  size = 'default',
  className = '',
  pendingReferralCode,
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      // Create Google provider with explicit client ID
      const provider = new GoogleAuthProvider();
      const clientId = import.meta.env.VITE_FIREBASE_GOOGLE_CLIENT_ID;
      
      if (clientId) {
        provider.setCustomParameters({
          client_id: clientId,
          prompt: 'select_account'
        });
      }
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Create or update user in Firestore (setDoc with merge handles both cases)
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
      
      // Check if this was a new user or existing user
      const existingUser = await getUser(user.uid);
      
      if (existingUser && existingUser.createdAt) {
        toast({
          title: "Welcome back!",
          description: "You've been signed in successfully."
        });
      } else {
        toast({
          title: "Welcome!",
          description: "Your account has been created successfully."
        });
      }
      
      onSuccess?.();
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      
      // Handle specific error cases
      let errorMessage = 'Failed to sign in with Google';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked by browser. Please allow popups and try again.';
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'This domain is not authorized for Google sign-in';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      onError?.(errorMessage);
      toast({
        title: "Sign-in failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Signed out",
        description: "You've been signed out successfully."
      });
    } catch (error: any) {
      console.error('Sign-out error:', error);
      toast({
        title: "Sign-out failed",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (auth.currentUser) {
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
  );
};

export default GoogleAuth;
