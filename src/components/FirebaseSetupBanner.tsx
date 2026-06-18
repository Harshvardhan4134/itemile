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
        Add your Firebase web app keys to <code className="text-xs">.env</code>{" "}
        (see <code className="text-xs">SETUP.md</code>), then restart{" "}
        <code className="text-xs">npm run dev</code>. Auth and data will not work
        until then.
      </AlertDescription>
    </Alert>
  );
}
