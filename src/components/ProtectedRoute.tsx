import { ReactNode, useEffect, useState, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import LocationPermissionDialog from "./LocationPermissionDialog";
import AccessCodeDialog from "./AccessCodeDialog";
import { checkUserAccess } from "@/lib/firestore";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!auth.currentUser);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [showAccessCodeDialog, setShowAccessCodeDialog] = useState(false);
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

      // Check access code if user is authenticated
      if (user) {
        setCheckingAccess(true);
        
        // First check localStorage for quick access
        const cachedAccess = localStorage.getItem(`access_granted_${user.uid}`);
        if (cachedAccess === 'true') {
          setHasAccess(true);
          setCheckingAccess(false);
        } else {
          // Check Firestore for access status
          checkUserAccess(user.uid)
            .then((access) => {
              if (!isMountedRef.current) return;
              
              setHasAccess(access);
              setCheckingAccess(false);
              
              if (access) {
                // Cache the access status
                localStorage.setItem(`access_granted_${user.uid}`, 'true');
              } else {
                // Show access code dialog if user doesn't have access
                timeoutRef.current = setTimeout(() => {
                  if (isMountedRef.current) {
                    setShowAccessCodeDialog(true);
                  }
                  timeoutRef.current = null;
                }, 500);
              }
            })
            .catch((error) => {
              console.error('Error checking user access:', error);
              if (!isMountedRef.current) return;
              
              // On error, show access code dialog to be safe
              setHasAccess(false);
              setCheckingAccess(false);
              timeoutRef.current = setTimeout(() => {
                if (isMountedRef.current) {
                  setShowAccessCodeDialog(true);
                }
                timeoutRef.current = null;
              }, 500);
            });
        }

        // Show location permission dialog after login if not already shown
        const hasRequestedLocation = localStorage.getItem(`location_permission_requested_${user.uid}`);
        
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
                localStorage.setItem(`location_permission_requested_${user.uid}`, 'true');
              } else if (result.state === 'denied') {
                // Permission denied, mark as requested to respect user's decision
                localStorage.setItem(`location_permission_requested_${user.uid}`, 'true');
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
        setHasAccess(null);
        setCheckingAccess(false);
        setShowAccessCodeDialog(false);
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

  if (loading || checkingAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectPath = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" state={{ from: redirectPath }} replace />;
  }

  // If user doesn't have access, show access code dialog
  // Don't render children until access is granted
  if (hasAccess === false) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Verifying access...</p>
          </div>
        </div>
        <AccessCodeDialog
          open={showAccessCodeDialog}
          onOpenChange={setShowAccessCodeDialog}
          onAccessGranted={() => {
            setHasAccess(true);
            setShowAccessCodeDialog(false);
            // Refresh the page to ensure all components load properly
            window.location.reload();
          }}
        />
      </>
    );
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
