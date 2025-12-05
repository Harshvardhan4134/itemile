import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface OtpDisplayProps {
  otp: string;
  title: string;
  description: string;
  expiresAt?: Date;
}

export const OtpDisplay = ({ otp, title, description, expiresAt }: OtpDisplayProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(otp);
    setCopied(true);
    toast({
      title: "OTP Copied!",
      description: "Share this code with the owner when collecting the item.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full">
      {/* Rapido-style OTP Display */}
      <div className="bg-gradient-to-br from-primary via-primary/90 to-secondary rounded-2xl p-8 shadow-2xl">
        <div className="text-center space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <h3 className="text-white/90 text-sm font-medium uppercase tracking-wider">
              {title}
            </h3>
            <p className="text-white/70 text-xs max-w-md mx-auto">
              {description}
            </p>
          </div>

          {/* Large OTP Display - Rapido Style */}
          <div className="relative">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border-2 border-white/20">
              <div className="space-y-3">
                <p className="text-white/60 text-xs font-medium uppercase tracking-wider">
                  Your OTP Code
                </p>
                <div className="flex items-center justify-center gap-4">
                  <p className="text-7xl sm:text-8xl font-black text-white tracking-[0.2em] font-mono select-all">
                    {otp}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopy}
                    className="h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 text-white border-2 border-white/30"
                  >
                    {copied ? (
                      <CheckCircle className="h-6 w-6 text-green-300" />
                    ) : (
                      <Copy className="h-6 w-6" />
                    )}
                  </Button>
                </div>
                {copied && (
                  <p className="text-green-300 text-sm font-medium animate-pulse">
                    ✓ Copied to clipboard!
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Expiry Info */}
          {expiresAt && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-white/80 text-sm">
                <span className="font-semibold">Valid until:</span>{" "}
                <span className="font-mono">
                  {expiresAt.toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <p className="text-white/90 text-sm leading-relaxed">
              💡 <strong>Show this code</strong> to the owner when collecting the item. 
              They will verify it before confirming the handover.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

