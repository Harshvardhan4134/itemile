import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { submitKYCDocuments } from '@/lib/firestore';
import { toast } from 'sonner';
import { Upload, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface KYCVerificationProps {
  user: any;
  onVerificationSubmitted?: () => void;
}

export function KYCVerification({ user, onVerificationSubmitted }: KYCVerificationProps) {
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState({
    aadharFront: null as File | null,
    aadharBack: null as File | null,
    pan: null as File | null,
    selfie: null as File | null,
  });

  const handleFileChange = (field: keyof typeof documents, file: File | null) => {
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    setDocuments(prev => ({ ...prev, [field]: file }));
  };

  const handleSubmit = async () => {
    if (!documents.aadharFront || !documents.aadharBack || !documents.pan) {
      toast.error('Please upload all required documents');
      return;
    }

    setUploading(true);
    try {
      // Upload documents to Cloudinary
      const [aadharFrontResult, aadharBackResult, panResult, selfieResult] = await Promise.all([
        uploadToCloudinary(documents.aadharFront, 'rent-share/kyc'),
        uploadToCloudinary(documents.aadharBack, 'rent-share/kyc'),
        uploadToCloudinary(documents.pan, 'rent-share/kyc'),
        documents.selfie ? uploadToCloudinary(documents.selfie, 'rent-share/kyc') : Promise.resolve(null),
      ]);

      // Extract secure_url from Cloudinary response
      const aadharFrontUrl = aadharFrontResult.secure_url;
      const aadharBackUrl = aadharBackResult.secure_url;
      const panUrl = panResult.secure_url;
      const selfieUrl = selfieResult?.secure_url || '';

      // Submit to Firestore
      await submitKYCDocuments(user.uid, {
        aadharFrontUrl,
        aadharBackUrl,
        panUrl,
        selfieUrl,
      });

      toast.success('Documents submitted successfully! We\'ll review them shortly.');
      onVerificationSubmitted?.();
    } catch (error) {
      console.error('Error submitting KYC:', error);
      toast.error('Failed to submit documents. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Show status based on verification state
  if (user.verificationStatus === 'pending') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Verification Pending
          </CardTitle>
          <CardDescription>Your documents are being reviewed by our team</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your verification is in progress. You'll receive an email notification once it's approved.
              This usually takes 24-48 hours.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (user.verificationStatus === 'approved') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Verified Account
          </CardTitle>
          <CardDescription>Your account has been verified</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your identity has been verified. You have full access to all platform features!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (user.verificationStatus === 'rejected') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Verification Failed
          </CardTitle>
          <CardDescription>Please re-upload your documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Reason:</strong> {user.rejectionReason || 'Documents could not be verified'}
            </AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground">
            Please upload clear, valid documents and submit again.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Default: Show upload form
  return (
    <Card>
      <CardHeader>
        <CardTitle>KYC Verification</CardTitle>
        <CardDescription>
          Upload your identity documents to verify your account and access all features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          {/* Aadhaar Front */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              Aadhaar Card - Front <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById('aadhar-front')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {documents.aadharFront ? documents.aadharFront.name : 'Choose File'}
              </Button>
              <input
                id="aadhar-front"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange('aadharFront', e.target.files?.[0] || null)}
              />
            </div>
          </div>

          {/* Aadhaar Back */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              Aadhaar Card - Back <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById('aadhar-back')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {documents.aadharBack ? documents.aadharBack.name : 'Choose File'}
              </Button>
              <input
                id="aadhar-back"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange('aadharBack', e.target.files?.[0] || null)}
              />
            </div>
          </div>

          {/* PAN Card */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              PAN Card <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById('pan')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {documents.pan ? documents.pan.name : 'Choose File'}
              </Button>
              <input
                id="pan"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange('pan', e.target.files?.[0] || null)}
              />
            </div>
          </div>

          {/* Selfie (Optional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              Selfie (Optional)
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById('selfie')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {documents.selfie ? documents.selfie.name : 'Choose File'}
              </Button>
              <input
                id="selfie"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange('selfie', e.target.files?.[0] || null)}
              />
            </div>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>All images must be clear and readable</li>
              <li>File size should be less than 5MB</li>
              <li>Accepted formats: JPG, PNG</li>
              <li>Verification typically takes 24-48 hours</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleSubmit}
          disabled={uploading || !documents.aadharFront || !documents.aadharBack || !documents.pan}
          className="w-full"
        >
          {uploading ? 'Uploading...' : 'Submit for Verification'}
        </Button>
      </CardContent>
    </Card>
  );
}
