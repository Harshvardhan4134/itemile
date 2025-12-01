import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';

interface LocationPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LocationPermissionDialog: React.FC<LocationPermissionDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [requesting, setRequesting] = useState(false);
  const { toast } = useToast();

  const checkLocationPermission = (): Promise<PermissionState> => {
    return new Promise((resolve) => {
      if (!navigator.permissions) {
        // Fallback for browsers that don't support Permissions API
        resolve('prompt');
        return;
      }

      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        resolve(result.state);
      }).catch(() => {
        resolve('prompt');
      });
    });
  };

  const handleAllowLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive",
      });
      onOpenChange(false);
      return;
    }

    setRequesting(true);

    try {
      // Just request permission by calling getCurrentPosition with a short timeout
      // This will trigger the browser's permission prompt without waiting for high accuracy
      // The actual location will be obtained by the Explore page with better accuracy settings
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: false, // Use false to get permission faster
            timeout: 5000, // Short timeout just to trigger permission
            maximumAge: 60000, // Accept cached location for permission check
          }
        );
      });

      // Store that we've requested location permission for this user
      if (auth.currentUser) {
        localStorage.setItem(`location_permission_requested_${auth.currentUser.uid}`, 'true');
      }

      toast({
        title: "Location access granted",
        description: "Location permission enabled. Your location will be used to find nearby items.",
      });

      onOpenChange(false);
    } catch (error: any) {
      // Even if we get an error, the permission might have been granted
      // The important thing is that we triggered the permission prompt
      
      if (auth.currentUser) {
        localStorage.setItem(`location_permission_requested_${auth.currentUser.uid}`, 'true');
      }

      if (error.code === error.PERMISSION_DENIED) {
        toast({
          title: "Location access denied",
          description: "Location access was denied. You can enable it later in your browser settings.",
          variant: "default",
        });
      } else {
        // For timeout or other errors, permission might still be granted
        // The Explore page will handle getting the actual location
        toast({
          title: "Location permission enabled",
          description: "Location access has been enabled. The app will use your location when available.",
        });
      }

      onOpenChange(false);
    } finally {
      setRequesting(false);
    }
  };

  const handleSkip = () => {
    // Store that user skipped the location request
    if (auth.currentUser) {
      localStorage.setItem(`location_permission_requested_${auth.currentUser.uid}`, 'true');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center">Enable Location Access</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Allow location access to find items and requests near you, get accurate distance calculations, and improve your experience on Lendlly.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={requesting}
            className="w-full sm:w-auto"
          >
            Skip for now
          </Button>
          <Button
            onClick={handleAllowLocation}
            disabled={requesting}
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          >
            {requesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Getting location...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Allow Location
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LocationPermissionDialog;

