import { isFirebaseConfigured } from "@/lib/firebase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function FirebaseSetupBanner() {
  if (isFirebaseConfigured) return null;

  return (
    <Alert
      variant="destructive"
      className="rounded-none border-x-0 border-t-0"
    >
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Firebase not configured</AlertTitle>
      <AlertDescription>
        Add your Firebase web app keys in{" "}
        <strong>Vercel → Project → Settings → Environment Variables</strong>{" "}
        (all <code className="text-xs">VITE_FIREBASE_*</code> vars from{" "}
        <code className="text-xs">.env.example</code>), then redeploy. Auth and
        data will not work until then.
      </AlertDescription>
    </Alert>
  );
}
