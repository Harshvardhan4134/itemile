import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VerificationBannerProps {
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  /** Admin exempted this user from KYC — hide nags */
  kycExempt?: boolean;
}

export function VerificationBanner({ verificationStatus, rejectionReason, kycExempt }: VerificationBannerProps) {
  const navigate = useNavigate();

  if (kycExempt) {
    return null;
  }

  if (!verificationStatus || verificationStatus === 'approved') {
    return null;
  }

  if (verificationStatus === 'pending') {
    return (
      <Alert className="rounded-none border-x-0 border-t-0 bg-yellow-50 border-yellow-200">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800 flex items-center justify-between">
          <span>
            Your verification is pending. You'll receive an email once it's approved.
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  if (verificationStatus === 'rejected') {
    return (
      <Alert className="rounded-none border-x-0 border-t-0 bg-red-50 border-red-200">
        <XCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800 flex items-center justify-between w-full">
          <span>
            Verification failed: {rejectionReason}. Please re-upload your documents.
          </span>
          <Button 
            size="sm" 
            variant="outline"
            className="ml-4 border-red-300 hover:bg-red-100"
            onClick={() => navigate('/profile')}
          >
            Upload Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
