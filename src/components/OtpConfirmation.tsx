import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon, Video, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadHandoverMedia, confirmPickupOtp, confirmReturnOtp } from "@/lib/firestore";
import { auth } from "@/lib/firebase";

interface OtpConfirmationProps {
  transactionId: string;
  stage: 'pickup' | 'return';
  onSuccess: () => void;
  onCancel: () => void;
  onPaymentRequired?: (transactionId: string) => void;
}

export const OtpConfirmation = ({ transactionId, stage, onSuccess, onCancel, onPaymentRequired }: OtpConfirmationProps) => {
  const [otp, setOtp] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
    
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    selectedFiles.forEach(file => {
      // Check file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        errors.push(`${file.name}: Invalid file type. Only images and videos are allowed.`);
        return;
      }
      
      // Check file size (100MB limit)
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File size exceeds 100MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB).`);
        return;
      }
      
      validFiles.push(file);
    });
    
    if (errors.length > 0) {
      toast({
        title: "File Validation Error",
        description: errors.join('\n'),
        variant: "destructive"
      });
    }
    
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles].slice(0, 10)); // Max 10 files
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!otp.trim()) {
      toast({
        title: "OTP Required",
        description: stage === 'pickup' 
          ? "Please enter the OTP provided by the owner."
          : "Please enter the return OTP provided by the renter.",
        variant: "destructive"
      });
      return;
    }

    // Check if at least one video is uploaded
    const hasVideo = files.some(file => file.type.startsWith('video/'));
    if (files.length === 0 || !hasVideo) {
      toast({
        title: "Video Required",
        description: "Please upload at least one video (max 100MB) to confirm the handover. This is mandatory for record keeping.",
        variant: "destructive"
      });
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "Please log in to confirm.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // First verify OTP
      const isValid = stage === 'pickup' 
        ? await confirmPickupOtp(transactionId, otp, user.uid)
        : await confirmReturnOtp(transactionId, otp, user.uid);

      if (!isValid) {
        toast({
          title: "Invalid OTP",
          description: "The OTP you entered is incorrect. Please check and try again.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Upload media (required - already validated above)
      console.log('Uploading handover media:', {
        transactionId,
        filesCount: files.length,
        stage,
        userId: user.uid,
        files: files.map(f => ({ name: f.name, type: f.type, size: f.size }))
      });
      
      try {
        await uploadHandoverMedia(transactionId, files, stage, user.uid);
        console.log('Handover media uploaded successfully');
        toast({
          title: "Media Uploaded",
          description: `${files.length} file(s) uploaded successfully.`,
        });
      } catch (uploadError: any) {
        console.error('Media upload error:', uploadError);
        toast({
          title: "Upload Error",
          description: uploadError.message || "Failed to upload media. Please try again.",
          variant: "destructive"
        });
        // Still proceed with OTP confirmation even if upload fails
        // The user can retry uploading later if needed
      }

      // If this is pickup, just confirm and let parent handle payment method selection
      if (stage === 'pickup') {
        toast({
          title: "Pickup Confirmed!",
          description: "Please select your payment method to complete the booking.",
        });
        
        // Call onSuccess to close OTP confirmation and show payment method dialog
        onSuccess();
      } else {
        toast({
          title: "Return Confirmed!",
          description: "The return has been successfully confirmed.",
        });
        
        onSuccess();
      }
    } catch (error: any) {
      console.error(`Error confirming ${stage}:`, error);
      toast({
        title: "Error",
        description: error.message || `Failed to confirm ${stage}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Confirm {stage === 'pickup' ? 'Pickup' : 'Return'}</CardTitle>
        <CardDescription>
          {stage === 'pickup' 
            ? "Enter the OTP provided by the owner and optionally upload photos/videos of the item condition. Payment will be processed after verification."
            : "Enter the OTP provided by the renter and optionally upload photos/videos of the item condition."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="otp">OTP Code</Label>
          <Input
            id="otp"
            type="text"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            className="text-2xl text-center tracking-widest font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label>
            Item Condition Video <span className="text-red-500">*</span> (Required)
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            At least one video is required (max 100MB per file). You can also upload additional photos/videos.
          </p>
          <div className="border-2 border-dashed rounded-lg p-4">
            <input
              type="file"
              id="media-upload"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <label
              htmlFor="media-upload"
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Click to upload video (required) and photos
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max 10 files, max 100MB per file
              </p>
            </label>
          </div>
          
          {files.length > 0 && (
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-blue-900 dark:text-blue-100">
                {files.some(f => f.type.startsWith('video/')) 
                  ? '✓ Video uploaded' 
                  : '⚠️ Please upload at least one video'}
              </p>
            </div>
          )}

          {files.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {files.map((file, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                    {file.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="relative w-full h-full">
                        <video
                          src={URL.createObjectURL(file)}
                          className="w-full h-full object-cover"
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Video className="h-8 w-8 text-white" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                          {file.name}
                        </div>
                        <div className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1 rounded">
                          {(file.size / (1024 * 1024)).toFixed(2)}MB
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !otp.trim() || files.length === 0 || !files.some(f => f.type.startsWith('video/'))}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              `Confirm ${stage === 'pickup' ? 'Pickup' : 'Return'}`
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

