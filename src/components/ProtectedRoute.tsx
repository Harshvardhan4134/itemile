import { ReactNode, useEffect, useState, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import LocationPermissionDialog from "./LocationPermissionDialog";
import { STORAGE_KEYS } from "@/lib/constants";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!auth.currentUser);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const location = useLocation();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Clear any pending timeout from previous auth state change
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (!isMountedRef.current) return;

      setIsAuthenticated(!!user);
      setLoading(false);

      if (user) {
        // Show location permission dialog after login if not already shown
        const hasRequestedLocation = localStorage.getItem(
          STORAGE_KEYS.locationPermissionRequested(user.uid)
        );
        
        // Check if geolocation permission is already granted
        if (!hasRequestedLocation && navigator.geolocation) {
          // Check permission state
          if (navigator.permissions) {
            navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
              if (!isMountedRef.current) return;

              // Only show dialog if permission is not already granted or denied
              // If granted, we don't need to show the dialog
              // If denied, user can enable it in browser settings
              // If prompt, show the dialog
              if (result.state === 'prompt') {
                // Small delay to ensure smooth transition after login
                timeoutRef.current = setTimeout(() => {
                  if (isMountedRef.current) {
                    setShowLocationDialog(true);
                  }
                  timeoutRef.current = null;
                }, 500);
              } else if (result.state === 'granted') {
                // Permission already granted, mark as requested so we don't show dialog again
                localStorage.setItem(
                  STORAGE_KEYS.locationPermissionRequested(user.uid),
                  "true"
                );
              } else if (result.state === "denied") {
                localStorage.setItem(
                  STORAGE_KEYS.locationPermissionRequested(user.uid),
                  "true"
                );
              }
            }).catch(() => {
              if (!isMountedRef.current) return;

              // If permission query fails, show dialog anyway
              timeoutRef.current = setTimeout(() => {
                if (isMountedRef.current) {
                  setShowLocationDialog(true);
                }
                timeoutRef.current = null;
              }, 500);
            });
          } else {
            // Browser doesn't support Permissions API, show dialog
            timeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                setShowLocationDialog(true);
              }
              timeoutRef.current = null;
            }, 500);
          }
        }
      } else {
        setShowLocationDialog(false);
      }
    });

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectPath = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" state={{ from: redirectPath }} replace />;
  }

  return (
    <>
      {children}
      <LocationPermissionDialog
        open={showLocationDialog}
        onOpenChange={setShowLocationDialog}
      />
    </>
  );
};

export default ProtectedRoute;
