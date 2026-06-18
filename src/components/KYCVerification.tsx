import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { submitKYCDocuments } from "@/lib/firestore";
import type { User } from "@/lib/firestore";
import {
  getKycRequiredKeys,
  KYC_DOC_LABELS,
  urlFieldForDocKey,
  type KycDocKey,
} from "@/lib/verificationPolicy";
import { CLOUDINARY_FOLDERS } from "@/lib/constants";
import { toast } from "sonner";
import { Upload, CheckCircle, XCircle, Clock, AlertCircle, ShieldOff } from "lucide-react";

interface KYCVerificationProps {
  user: User;
  onVerificationSubmitted?: () => void;
}


export function KYCVerification({ user, onVerificationSubmitted }: KYCVerificationProps) {
  const requiredKeys = useMemo(() => getKycRequiredKeys(user), [user]);

  const emptyDocs = (): Record<KycDocKey, File | null> => ({
    driversLicenseFront: null,
    driversLicenseBack: null,
    selfie: null,
  });

  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<Record<KycDocKey, File | null>>(emptyDocs);

  const handleFileChange = (field: KycDocKey, file: File | null) => {
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }
    setDocuments((prev) => ({ ...prev, [field]: file }));
  };

  const handleSubmit = async () => {
    for (const key of requiredKeys) {
      if (!documents[key]) {
        toast.error(`Please upload: ${KYC_DOC_LABELS[key]}`);
        return;
      }
    }

    setUploading(true);
    try {
      const payload: Partial<{
        driversLicenseFrontUrl: string;
        driversLicenseBackUrl: string;
        selfieUrl: string;
      }> = {};

      for (const key of requiredKeys) {
        const file = documents[key]!;
        const result = await uploadToCloudinary(file, CLOUDINARY_FOLDERS.kyc);
        const field = urlFieldForDocKey(key);
        payload[field] = result.secure_url;
      }

      await submitKYCDocuments(user.uid, payload);

      toast.success("Documents submitted successfully! We'll review them shortly.");
      onVerificationSubmitted?.();
    } catch (error) {
      console.error("Error submitting KYC:", error);
      toast.error("Failed to submit documents. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (user.kycExempt === true) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-muted-foreground" />
            Verification not required
          </CardTitle>
          <CardDescription>
            An administrator has set your account to skip identity verification. You can rent, pay, and post
            without submitting documents.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (user.verificationStatus === "pending") {
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
              Your verification is in progress. You&apos;ll receive an email notification once it&apos;s approved.
              This usually takes 24-48 hours.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (user.verificationStatus === "approved") {
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

  const inputId = (k: KycDocKey) => `kyc-${k}`;

  const canSubmit =
    requiredKeys.length > 0 && requiredKeys.every((k) => documents[k] != null);

  const formBody = (
    <>
      <div className="grid gap-4">
        {requiredKeys.map((key) => (
          <div key={key} className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              {KYC_DOC_LABELS[key]} <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById(inputId(key))?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {documents[key] ? documents[key]!.name : "Choose File"}
              </Button>
              <input
                id={inputId(key)}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(key, e.target.files?.[0] || null)}
              />
            </div>
          </div>
        ))}
      </div>

      {requiredKeys.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No documents are required for your account configuration.</AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>All images must be clear and readable</li>
            <li>File size should be less than 5MB</li>
            <li>Accepted formats: JPG, PNG</li>
            <li>Verification typically takes 24-48 hours</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Button onClick={handleSubmit} disabled={uploading || !canSubmit} className="w-full">
        {uploading ? "Uploading..." : "Submit for Verification"}
      </Button>
    </>
  );

  if (user.verificationStatus === "rejected") {
    return (
      <div className="space-y-4">
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
                <strong>Reason:</strong> {user.rejectionReason || "Documents could not be verified"}
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              Please upload clear, valid documents and submit again.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Resubmit documents</CardTitle>
            <CardDescription>
              Upload the documents requested for your account. Required items are marked with{" "}
              <span className="text-red-500">*</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">{formBody}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Identity verification</CardTitle>
        <CardDescription>
          Upload the documents requested for your account. Required items are marked with{" "}
          <span className="text-red-500">*</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {formBody}
      </CardContent>
    </Card>
  );
}

