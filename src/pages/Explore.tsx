import { useState, useEffect, useMemo } from "react";
import { formatCurrency } from "@/lib/format";
import { Header } from "@/components/Layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link, useNavigate } from "react-router-dom";
import LiveMap from "@/components/LiveMap";
import LocationPickerMap from "@/components/LocationPickerMap";
import { 
  getListings, 
  Listing, 
  getAllRequests, 
  Request,
  getMessagePosts,
  MessagePost,
  createMessagePost,
  likeMessagePost,
  addCommentToMessagePost,
  likeListing,
  addCommentToListing,
  likeRequest,
  addCommentToRequest,
  getUser,
  updateUserLocation,
  User,
} from "@/lib/firestore";
import { 
  MapPin, 
  Search, 
  Heart,
  MessageCircle,
  MoreVertical,
  Send,
  Grid3x3,
  List,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Star,
  Smartphone,
  Bike,
  Camera,
  Gamepad2,
  Music,
  Wrench,
  Dumbbell,
  Book,
  Shirt,
  Home,
  Shield,
  CheckCircle,
  Building2,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import TermsNotification from "@/components/TermsNotification";
import { uploadMultipleImages } from "@/lib/cloudinary";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { isDirectListingAllowed } from "@/lib/categoryRules";
import { cn } from "@/lib/utils";
import {
  CITY_COORDS,
  DEFAULT_MAP_CENTER,
  STORAGE_KEYS,
} from "@/lib/constants";

const TERMS_VERSION = "2026-06";
const buildTermsKey = (uid?: string | null) =>
  STORAGE_KEYS.termsAccepted(TERMS_VERSION, uid);

const hasAcceptedTerms = (user?: FirebaseUser | null): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const key = buildTermsKey(user?.uid);
    return localStorage.getItem(key) === "true";
  } catch (error) {
    console.warn("Unable to read terms acceptance from storage", error);
    return false;
  }
};

const persistTermsAcceptance = (user?: FirebaseUser | null) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const key = buildTermsKey(user?.uid);
    localStorage.setItem(key, "true");
  } catch (error) {
    console.warn("Unable to persist terms acceptance", error);
  }
};

/** Default map center when GPS / city is not available yet */
const LISTINGS_PER_PAGE = 9;

// Calculate distance between two points using Haversine formula (in km)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/** Single source of truth for city scoping — shop grid + category counts. "Current Location" does not filter by radius (map is for positioning only). */
function applyExploreLocationFilter(
  publicListings: Listing[],
  selectedCityFromStorage: string | null
): Listing[] {
  if (!selectedCityFromStorage || selectedCityFromStorage === "Current Location") {
    return publicListings;
  }

  const selectedCityLower = selectedCityFromStorage.toLowerCase();
  const cityCoords = CITY_COORDS[selectedCityLower];

  return publicListings.filter((listing) => {
    if (listing.city && listing.city.toLowerCase() === selectedCityLower) {
      return true;
    }
    if (!listing.city && cityCoords && listing.location) {
      const distance = calculateDistance(
        cityCoords.lat,
        cityCoords.lng,
        listing.location.latitude,
        listing.location.longitude
      );
      return distance <= 100;
    }
    if (!listing.city && !listing.location) {
      return true;
    }
    return false;
  });
}

const Explore = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<Listing | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [listingsRaw, setListingsRaw] = useState<Listing[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [messagePosts, setMessagePosts] = useState<MessagePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [attemptedGeolocation, setAttemptedGeolocation] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [showManualLocationPicker, setShowManualLocationPicker] = useState(false);
  const [manualLocation, setManualLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!auth.currentUser);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [userData, setUserData] = useState<any>(null);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(() => hasAcceptedTerms(auth.currentUser));
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [selectedCityFromStorage, setSelectedCityFromStorage] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEYS.selectedCity);
  });

  const listings = useMemo(
    () => applyExploreLocationFilter(listingsRaw, selectedCityFromStorage),
    [listingsRaw, selectedCityFromStorage]
  );
  const [owners, setOwners] = useState<Record<string, User>>({});
  const [shopSort, setShopSort] = useState<"new" | "popular">("new");
  const [listingsPage, setListingsPage] = useState(1);
  const BUSINESS_LISTING_THRESHOLD = 5; // Show as business if owner has 5+ listings

  // Treat very coarse location (> this radius in meters) as too imprecise to override a chosen city
  const COARSE_ACCURACY_THRESHOLD = 20000; // 20 km
  
  // Post creation state
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [postMessage, setPostMessage] = useState("");
  const [postImages, setPostImages] = useState<File[]>([]);
  const [postImageUrls, setPostImageUrls] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  
  // Comment state
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [commentingPostType, setCommentingPostType] = useState<'message' | 'listing' | 'request' | null>(null);
  const [commentText, setCommentText] = useState("");

  const categories = [
    { icon: Smartphone, name: "Electronics", value: "Electronics" },
    { icon: Bike, name: "Sports & Outdoor", value: "Sports" },
    { icon: Camera, name: "Photography", value: "Photography" },
    { icon: Gamepad2, name: "Gaming", value: "Gaming" },
    { icon: Music, name: "Music", value: "Music" },
    { icon: Wrench, name: "Tools", value: "Tools" },
    { icon: Dumbbell, name: "Fitness", value: "Fitness" },
    { icon: Book, name: "Books", value: "Books" },
    { icon: Shirt, name: "Clothing", value: "Clothing" },
    { icon: Home, name: "Furniture", value: "Furniture" },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsAuthenticated(!!user);
      setCurrentUser(user);
      setTermsAccepted(hasAcceptedTerms(user));
      if (user) {
        const data = await getUser(user.uid);
        setUserData(data);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const listingsPromise = getListings();
        const requestsPromise = isAuthenticated ? getAllRequests() : Promise.resolve<Request[]>([]);
        const postsPromise = getMessagePosts();

        const [listingsData, requestsData, postsData] = await Promise.all([
          listingsPromise,
          requestsPromise,
          postsPromise
        ]);

        if (!isMounted) return;

        // Store full listing set; city/GPS scoping runs in useMemo (applyExploreLocationFilter)
        const publicListings = listingsData;

        // Fetch owner data for business account grouping
        const ownerIds = [...new Set(publicListings.map(l => l.ownerId))];
        const ownerPromises = ownerIds.map(id => getUser(id));
        const ownerData = await Promise.all(ownerPromises);
        const ownersMap: Record<string, User> = {};
        ownerData.forEach((owner, index) => {
          if (owner) {
            ownersMap[ownerIds[index]] = owner;
          }
        });
        setOwners(ownersMap);

        setListingsRaw(publicListings);
        setRequests(requestsData);
        setMessagePosts(postsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        if (!isMounted) return;
        setRequests([]);
        setMessagePosts([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncCityFromStorage = () => {
      setSelectedCityFromStorage(localStorage.getItem(STORAGE_KEYS.selectedCity));
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.selectedCity) {
        syncCityFromStorage();
      }
    };

    const handleCityChanged = () => {
      syncCityFromStorage();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(STORAGE_KEYS.cityChangedEvent, handleCityChanged as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(STORAGE_KEYS.cityChangedEvent, handleCityChanged as EventListener);
    };
  }, []);

  // If a city was selected in the header, use it to set a default map center
  useEffect(() => {
    if (!selectedCityFromStorage) return;
    
    // Handle "Current Location" - this will trigger GPS fetch in the main location effect
    if (selectedCityFromStorage === "Current Location") {
      // Reset attemptedGeolocation to allow GPS fetch
      setAttemptedGeolocation(false);
      return;
    }
    
    // For regular cities, use CITY_COORDS (don't fetch GPS)
    const key = selectedCityFromStorage.toLowerCase();
    const coords = CITY_COORDS[key];
    if (coords) {
      setUserLocation(coords);
      setLocationAccuracy(0);
      setAttemptedGeolocation(true); // Mark as attempted so GPS won't override
      setManualLocation(coords);
    }
  }, [selectedCityFromStorage, userLocation]);

  const handleLocationUpdate = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser.');
      toast({
        title: "Location Error",
        description: "Geolocation is not supported by this browser.",
        variant: "destructive"
      });
      setAttemptedGeolocation(true);
      setIsUpdatingLocation(false);
      return;
    }
    
    const useSelectedCityFallback = () => {
      if (!selectedCityFromStorage) return false;
      const key = selectedCityFromStorage.toLowerCase();
      const coords = CITY_COORDS[key];
      if (coords) {
        setUserLocation(coords);
        setLocationAccuracy(0);
        setAttemptedGeolocation(true);
        setIsUpdatingLocation(false);
        toast({
          title: "Using selected city",
          description: `Location unavailable; centering on ${selectedCityFromStorage}.`,
        });
        return true;
      }
      return false;
    };

    setIsUpdatingLocation(true);
    setLocationAccuracy(null);
    
    // Validate coordinates
    const isValidCoordinate = (lat: number, lng: number): boolean => {
      return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && 
             !isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng);
    };
    
    // Use watchPosition for better GPS accuracy, but with a timeout
    let watchId: number | null = null;
    let bestLocation: { lat: number; lng: number } | null = null;
    let bestAccuracy = Infinity;
    let acceptedAccuracy = Infinity; // Track the accuracy of the location we've already accepted
    let locationCount = 0;
    let hasAcceptedLocation = false; // Track if we've already accepted and displayed a location
    const maxLocations = 10; // Get up to 10 location updates to find the best one (increased for better accuracy)
    const maxWatchTime = 30000; // Stop watching after 30 seconds (increased to give GPS more time to improve)
    const TARGET_ACCURACY = 50; // Target accuracy in meters - we'll wait for this if possible
    const MIN_ACCEPTABLE_ACCURACY = 500; // Minimum accuracy to accept immediately (500m)
    
    const stopWatching = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };
    
    // Set a timeout to stop watching
    const watchTimeout = setTimeout(() => {
      stopWatching();
      const MAX_ACCEPTABLE_ACCURACY = 10000; // 10km
      
      if (bestLocation && isValidCoordinate(bestLocation.lat, bestLocation.lng) && bestAccuracy <= MAX_ACCEPTABLE_ACCURACY) {
        setUserLocation(bestLocation);
        setLocationAccuracy(bestAccuracy);
        setAttemptedGeolocation(true);
        setIsUpdatingLocation(false);
        console.log('✅ Final location after watch:', bestLocation, 'Accuracy: ±' + Math.round(bestAccuracy) + 'm');
        console.log('📍 This is YOUR GPS location from your device, not from database');
        toast({
          title: "Location Updated",
          description: `Your GPS location: ±${Math.round(bestAccuracy)}m accuracy`,
        });
      } else {
        // No valid location found after timeout - try fallback
        // Don't show error yet, let fallback try first
        // Silently try fallback without logging
      }
      
      // Fallback to getCurrentPosition if watchPosition didn't get a location
      if (!bestLocation) {
        // Silently try fallback method
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            const accuracy = pos.coords.accuracy;
            
            const MAX_ACCEPTABLE_ACCURACY = 10000; // 10km
            
            if (isValidCoordinate(coords.lat, coords.lng) && accuracy <= MAX_ACCEPTABLE_ACCURACY) {
              console.log('✅ Fallback location obtained (getCurrentPosition):', coords, 'Accuracy: ±' + Math.round(accuracy) + 'm');
              setUserLocation(coords);
              setLocationAccuracy(accuracy);
              setAttemptedGeolocation(true);
              setIsUpdatingLocation(false);
              
              // Save to database
              if (auth.currentUser) {
                updateUserLocation(auth.currentUser.uid, coords.lat, coords.lng).catch(err => {
                  console.warn('Failed to save location to database:', err);
                });
              }
              
              toast({
                title: "Location Updated",
                description: `Your GPS location: ±${Math.round(accuracy)}m accuracy`,
              });
            } else if (isValidCoordinate(coords.lat, coords.lng)) {
              // Accept coarse accuracy to unblock UI
              const isTooCoarse = accuracy > COARSE_ACCURACY_THRESHOLD && !!selectedCityFromStorage;
              if (isTooCoarse) {
                console.warn('⚠️ Coarse fallback ignored because a city is selected:', accuracy + 'm');
              } else {
                console.warn('⚠️ Location accuracy is coarse:', accuracy + 'm, using it for now.');
                setUserLocation(coords);
                setLocationAccuracy(accuracy);
                setAttemptedGeolocation(true);
                setIsUpdatingLocation(false);
                toast({
                  title: "Location Updated (coarse)",
                  description: `Accuracy is about ±${Math.round(accuracy/1000)}km. You can refine via manual picker.`,
                  variant: "default",
                  duration: 8000,
                  action: (
                    <Button
                      size="sm"
                      onClick={() => setShowManualLocationPicker(true)}
                      className="ml-2"
                    >
                      Pick Location
                    </Button>
                  )
                });
              }
            } else {
              console.error('❌ Invalid coordinates received:', coords);
              setIsUpdatingLocation(false);
              setAttemptedGeolocation(true);
              toast({
                title: "Location Error",
                description: "Received invalid location coordinates. Please try again or use manual picker.",
                variant: "destructive",
                action: (
                  <Button
                    size="sm"
                    onClick={() => setShowManualLocationPicker(true)}
                    className="ml-2"
                  >
                    Pick Location
                  </Button>
                )
              });
            }
          },
          (err) => {
            setIsUpdatingLocation(false);
            setAttemptedGeolocation(true);
            let errorMessage = 'Failed to get location';
            if (err.code === err.PERMISSION_DENIED) {
              errorMessage = 'Location access denied. Please allow location access in your browser settings.';
            } else if (err.code === err.POSITION_UNAVAILABLE) {
              errorMessage = 'Location information unavailable. Please use manual location picker.';
            } else if (err.code === err.TIMEOUT) {
              errorMessage = 'Location request timed out. Please try again or use manual location picker.';
            }
            console.warn('❌ Error getting current position:', errorMessage);
            const usedCity = useSelectedCityFallback();
            if (usedCity) return;
            toast({
              title: "GPS Not Available",
              description: errorMessage,
              variant: "destructive",
              duration: 10000,
              action: (
                <Button
                  size="sm"
                  onClick={() => setShowManualLocationPicker(true)}
                  className="ml-2"
                >
                  Pick Location
                </Button>
              )
            });
          },
          { 
            enableHighAccuracy: true, // Force GPS instead of IP-based location
            timeout: 20000, // 20 seconds timeout
            maximumAge: 0 // Always get fresh GPS data, never use cached
          }
        );
      } else {
        // We already have a location from watchPosition, no need for fallback
        console.log('✅ Location already obtained from watchPosition, skipping fallback');
      }
    }, maxWatchTime);
    
    // Start watching position for better accuracy.
    // Accept coarse/IP positions immediately to unblock UI unless user picked a city and accuracy is extremely coarse.
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const accuracy = pos.coords.accuracy;
        const timestamp = pos.timestamp;
        const altitude = pos.coords.altitude;
        const heading = pos.coords.heading;
        const speed = pos.coords.speed;
        
        // Log detailed location info only for accepted locations (reduced verbosity)
        if (locationCount === 0 || accuracy < 100) {
          console.log(`📍 Location update ${locationCount + 1}:`, {
            coordinates: coords,
            accuracy: `±${Math.round(accuracy)}m`,
            source: 'GPS (watchPosition)'
          });
        }
        
        if (!isValidCoordinate(coords.lat, coords.lng)) {
          console.error('❌ Invalid coordinates received:', coords);
          return;
        }
        
        const isTooCoarseWithCity = accuracy > COARSE_ACCURACY_THRESHOLD && !!selectedCityFromStorage;

        // Accept the first valid coordinate (even coarse/IP) so the map centers,
        // unless it's extremely coarse and a city has been explicitly selected.
        if (!userLocation && !isTooCoarseWithCity) {
          setUserLocation(coords);
          setLocationAccuracy(accuracy);
          setAttemptedGeolocation(true);
        }

        locationCount++;
        
        // Track the best location (most accurate)
        if (accuracy < bestAccuracy) {
          bestLocation = coords;
          bestAccuracy = accuracy;
          
          // Strategy: Wait for better accuracy, but accept good enough locations
          // - If accuracy is excellent (< TARGET_ACCURACY), accept immediately
          // - If accuracy is good (< MIN_ACCEPTABLE_ACCURACY), accept after a few updates
          // - If accuracy is moderate, wait longer to see if it improves
          // - Always accept the best location we've seen so far
          
          const shouldAcceptNow = 
            accuracy < TARGET_ACCURACY || // Excellent accuracy - accept immediately
            (accuracy < MIN_ACCEPTABLE_ACCURACY && locationCount >= 3) || // Good accuracy after a few updates
            (locationCount >= 5 && !hasAcceptedLocation); // After 5 updates, accept best so far
          
          if (shouldAcceptNow && !hasAcceptedLocation) {
            hasAcceptedLocation = true;
            acceptedAccuracy = accuracy;
            setUserLocation(coords);
            setLocationAccuracy(accuracy);
            setAttemptedGeolocation(true);
            setIsUpdatingLocation(false);
            
            // Save to database if user is authenticated
            if (auth.currentUser) {
              updateUserLocation(auth.currentUser.uid, coords.lat, coords.lng).catch(err => {
                console.warn('Failed to save location to database:', err);
              });
            }
            
            console.log('✅ Location accepted:', coords, 'Accuracy: ±' + Math.round(accuracy) + 'm');
            toast({
              title: "Location Updated",
              description: `GPS location: ±${Math.round(accuracy)}m accuracy`,
            });
          } else if (accuracy < acceptedAccuracy && hasAcceptedLocation) {
            // Update if we got a better location than what we already accepted
            acceptedAccuracy = accuracy;
            setUserLocation(coords);
            setLocationAccuracy(accuracy);
            
            // Update database with better location
            if (auth.currentUser) {
              updateUserLocation(auth.currentUser.uid, coords.lat, coords.lng).catch(err => {
                console.warn('Failed to update location in database:', err);
              });
            }
            
            console.log('✅ Location improved:', coords, 'Accuracy: ±' + Math.round(accuracy) + 'm');
          }
        }
        
        // Stop watching if we have an excellent location or enough updates
        // Continue watching to improve accuracy if we haven't reached target yet
        const shouldStop = 
          bestAccuracy < TARGET_ACCURACY || // Got excellent accuracy
          (bestAccuracy < MIN_ACCEPTABLE_ACCURACY && locationCount >= 5) || // Good accuracy after several updates
          locationCount >= maxLocations; // Reached max updates
        
        if (shouldStop) {
          stopWatching();
          clearTimeout(watchTimeout);
          
          // Ensure we've set the best location
          if (bestLocation && bestAccuracy <= MAX_ACCEPTABLE_ACCURACY && !hasAcceptedLocation) {
            hasAcceptedLocation = true;
            acceptedAccuracy = bestAccuracy;
            setUserLocation(bestLocation);
            setLocationAccuracy(bestAccuracy);
            setAttemptedGeolocation(true);
            setIsUpdatingLocation(false);
            
            // Save to database
            if (auth.currentUser) {
              updateUserLocation(auth.currentUser.uid, bestLocation.lat, bestLocation.lng).catch(err => {
                console.warn('Failed to save location to database:', err);
              });
            }
            
            console.log('✅ Final best location:', bestLocation, 'Accuracy: ±' + Math.round(bestAccuracy) + 'm');
          } else if (bestLocation && bestAccuracy < acceptedAccuracy && hasAcceptedLocation) {
            // Update if final best is better than what we accepted
            acceptedAccuracy = bestAccuracy;
            setUserLocation(bestLocation);
            setLocationAccuracy(bestAccuracy);
            
            if (auth.currentUser) {
              updateUserLocation(auth.currentUser.uid, bestLocation.lat, bestLocation.lng).catch(err => {
                console.warn('Failed to update location in database:', err);
              });
            }
            
            console.log('✅ Updated to final best location:', bestLocation, 'Accuracy: ±' + Math.round(bestAccuracy) + 'm');
          }
        }
      },
      (err) => {
        stopWatching();
        clearTimeout(watchTimeout);
        setIsUpdatingLocation(false);
        let errorMessage = 'Failed to get location';
        if (err.code === err.PERMISSION_DENIED) {
          errorMessage = 'Location access denied. Please allow location access in your browser settings.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMessage = 'Location information unavailable.';
        } else if (err.code === err.TIMEOUT) {
          errorMessage = 'Location request timed out. Please try again.';
        }
        console.warn('Error watching position:', errorMessage);
        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive"
        });
        setAttemptedGeolocation(true);
      },
      { 
        enableHighAccuracy: true, // Force GPS instead of IP-based location
        timeout: 20000, // 20 seconds timeout
        maximumAge: 0 // Always get fresh GPS data, never use cached
      }
    );
  };

  useEffect(() => {
    // Only attempt location on initial mount or when "Current Location" is selected
    // IMPORTANT: Always get fresh GPS location, never use database location
    if (!attemptedGeolocation) {
      // If "Current Location" is selected, fetch GPS location
      // If a regular city is selected, don't fetch GPS (city coords already set above)
      if (selectedCityFromStorage === "Current Location" || !selectedCityFromStorage) {
        // Clear any existing location to ensure we get fresh GPS data
        setUserLocation(null);
        setLocationAccuracy(null);
        handleLocationUpdate();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCityFromStorage]);

  const handleAcceptTerms = () => {
    persistTermsAcceptance(currentUser);
    setTermsAccepted(true);
    setShowTermsDialog(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPostImages([...postImages, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPostImageUrls(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setPostImages(prev => prev.filter((_, i) => i !== index));
    setPostImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (!currentUser || !postMessage.trim() && postImages.length === 0) {
      toast({
        title: "Error",
        description: "Please add a message or image to your post",
        variant: "destructive"
      });
      return;
    }

    try {
      setPosting(true);
      let imageUrls: string[] = [];

      if (postImages.length > 0) {
        imageUrls = await uploadMultipleImages(postImages);
      }

      const user = await getUser(currentUser.uid);
      await createMessagePost({
        userId: currentUser.uid,
        userName: user?.name || currentUser.displayName || "User",
        userPhotoUrl: user?.profilePhotoUrl || currentUser.photoURL || undefined,
        message: postMessage,
        images: imageUrls
      });

      const posts = await getMessagePosts();
      setMessagePosts(posts);

      setPostMessage("");
      setPostImages([]);
      setPostImageUrls([]);
      setShowPostDialog(false);

      toast({
        title: "Success",
        description: "Post created successfully!"
      });
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create post. Please check Firestore rules are deployed.",
        variant: "destructive"
      });
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string, type: 'message' | 'listing' | 'request') => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Please login to like posts",
        variant: "destructive"
      });
      return;
    }

    try {
      if (type === 'message') {
        await likeMessagePost(postId, currentUser.uid);
        const posts = await getMessagePosts();
        setMessagePosts(posts);
      } else if (type === 'listing') {
        await likeListing(postId, currentUser.uid);
        const listingsData = await getListings();
        setListingsRaw(listingsData);
      } else if (type === 'request') {
        await likeRequest(postId, currentUser.uid);
        const requestsData = await getAllRequests();
        setRequests(requestsData);
      }
    } catch (error) {
      console.error("Error liking:", error);
    }
  };

  const handleAddComment = async (postId: string, type: 'message' | 'listing' | 'request') => {
    if (!currentUser || !commentText.trim()) return;

    try {
      const user = await getUser(currentUser.uid);
      const commentData = {
        userId: currentUser.uid,
        userName: user?.name || currentUser.displayName || "User",
        userPhotoUrl: user?.profilePhotoUrl || currentUser.photoURL || undefined,
        text: commentText
      };

      if (type === 'message') {
        await addCommentToMessagePost(postId, commentData);
        const posts = await getMessagePosts();
        setMessagePosts(posts);
      } else if (type === 'listing') {
        await addCommentToListing(postId, commentData);
        const listingsData = await getListings();
        setListingsRaw(listingsData);
      } else if (type === 'request') {
        await addCommentToRequest(postId, commentData);
        const requestsData = await getAllRequests();
        setRequests(requestsData);
      }

      setCommentText("");
      setCommentingPostId(null);
      setCommentingPostType(null);
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      });
    }
  };

  const formatDate = (date: any) => {
    if (!date) return "";
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return formatDistanceToNow(dateObj, { addSuffix: true });
    } catch {
      return "";
    }
  };

  // Group listings by owner to identify business accounts
  const listingsByOwner: Record<string, Listing[]> = {};
  listings.forEach(listing => {
    if (!listingsByOwner[listing.ownerId]) {
      listingsByOwner[listing.ownerId] = [];
    }
    listingsByOwner[listing.ownerId].push(listing);
  });

  // Identify business accounts (owners with 5+ listings)
  const businessOwners = Object.keys(listingsByOwner).filter(
    ownerId => listingsByOwner[ownerId].length >= BUSINESS_LISTING_THRESHOLD
  );

  // Separate business listings from individual listings
  const businessListingIds = new Set(
    businessOwners.flatMap(ownerId => listingsByOwner[ownerId].map(l => l.id))
  );
  const individualListings = listings.filter(l => !businessListingIds.has(l.id));
  const businessListings = listings.filter(l => businessListingIds.has(l.id));

  // Combine all posts (listings, requests, message posts) and sort by date
  // Business cards are added instead of individual listings for owners with 5+ items
  const allPosts = [
    // Individual listings (from owners with < 5 listings)
    ...individualListings.map(listing => ({ type: 'listing' as const, data: listing, createdAt: listing.createdAt })),
    // Business cards (one per owner with 5+ listings)
    ...businessOwners.map(ownerId => {
      const ownerListings = listingsByOwner[ownerId];
      const owner = owners[ownerId];
      return {
        type: 'business' as const,
        data: {
          ownerId,
          ownerName: owner?.name || 'Business',
          businessName: owner?.businessName || owner?.name || 'Business',
          listingCount: ownerListings.length,
          listings: ownerListings,
          featuredListing: ownerListings[0], // Use first listing as featured
        },
        createdAt: ownerListings[0]?.createdAt || new Date()
      };
    }),
    // Requests and message posts
    ...requests.map(request => ({ type: 'request' as const, data: request, createdAt: request.createdAt })),
    ...messagePosts.map(post => ({ type: 'message' as const, data: post, createdAt: post.createdAt }))
  ].sort((a, b) => {
    const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
    const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
    return bTime - aTime; // Newest first
  });

  // Filter posts (listings/businesses already scoped by `listings` + applyExploreLocationFilter)
  const filteredPosts = allPosts.filter(post => {
    // Then apply search and category filters
    const q = searchTerm.trim().toLowerCase();
    if (post.type === 'message') {
      const messagePost = post.data as MessagePost;
      const text = (messagePost.message || "").toLowerCase();
      return !q || text.includes(q);
    }
    if (post.type === 'listing') {
      const listing = post.data as Listing;
      const matchesSearch =
        !q ||
        (listing.title || "").toLowerCase().includes(q) ||
        (listing.description || "").toLowerCase().includes(q) ||
        (listing.category || "").toLowerCase().includes(q);
      const matchesCategory = !selectedCategory || listing.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }
    if (post.type === 'business') {
      const business = post.data as {
        ownerId: string;
        businessName: string;
        listings: Listing[];
      };
      const matchesSearch =
        !q ||
        (business.businessName || "").toLowerCase().includes(q) ||
        business.listings.some(
          (l) =>
            (l.title || "").toLowerCase().includes(q) ||
            (l.category || "").toLowerCase().includes(q) ||
            (l.description || "").toLowerCase().includes(q)
        );
      const matchesCategory =
        !selectedCategory || business.listings.some((l) => l.category === selectedCategory);
      return matchesSearch && matchesCategory;
    }
    const request = post.data as Request;
    const matchesSearch =
      !q ||
      (request.itemName || "").toLowerCase().includes(q) ||
      (request.description || "").toLowerCase().includes(q) ||
      (request.category || "").toLowerCase().includes(q);
    const matchesCategory = !selectedCategory || request.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categoryCounts = categories.map((cat) => ({
    ...cat,
    count: listings.filter((l) => l.category === cat.value).length,
  }));

  const shopItems = useMemo(() => {
    const items = filteredPosts.filter(
      (p) => p.type === "listing" || p.type === "business"
    );
    const getTime = (p: (typeof items)[number]) => {
      const raw = p.createdAt?.toDate
        ? p.createdAt.toDate().getTime()
        : new Date(p.createdAt).getTime();
      return Number.isFinite(raw) ? raw : 0;
    };
    const likeSum = (l: Listing) => l.likes?.length ?? 0;
    const pop = (p: (typeof items)[number]) => {
      if (p.type === "listing") return likeSum(p.data as Listing);
      const b = p.data as { listings: Listing[] };
      return b.listings.reduce((s, l) => s + likeSum(l), 0);
    };
    const sorted = [...items];
    if (shopSort === "new") {
      sorted.sort((a, b) => getTime(b) - getTime(a));
    } else {
      sorted.sort((a, b) => pop(b) - pop(a));
    }
    return sorted;
  }, [filteredPosts, shopSort]);

  const totalShopCount = shopItems.length;
  const totalListingsPages = Math.max(1, Math.ceil(totalShopCount / LISTINGS_PER_PAGE));
  const paginatedShopItems = shopItems.slice(
    (listingsPage - 1) * LISTINGS_PER_PAGE,
    listingsPage * LISTINGS_PER_PAGE
  );

  useEffect(() => {
    setListingsPage(1);
  }, [searchTerm, selectedCategory, shopSort, selectedCityFromStorage]);

  const mapHeroCenter =
    userLocation ??
    (selectedCityFromStorage &&
    selectedCityFromStorage !== "Current Location"
      ? CITY_COORDS[selectedCityFromStorage.toLowerCase()]
      : undefined) ??
    DEFAULT_MAP_CENTER;

  return (
    <div className="app-shell">
      <Header />
      
      <div className="relative">
        {/* Map hero (replaces static shop hero — always visible once data is ready) */}
        <div className="relative h-[300px] w-full overflow-hidden sm:h-[380px] md:h-[440px]">
          {loading ? (
            <div className="flex h-full w-full items-center justify-center bg-muted/30">
              <div className="p-8 text-center">
                <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                <p className="text-sm text-muted-foreground">Loading map…</p>
              </div>
            </div>
          ) : (
            <div className="relative h-full w-full">
              <LiveMap
                listings={listings}
                requests={requests}
                onListingSelect={setSelectedItem}
                center={mapHeroCenter}
                zoom={userLocation ? 14 : selectedCityFromStorage && selectedCityFromStorage !== "Current Location" ? 11 : 10}
                userLocation={userLocation}
                onLocationUpdate={handleLocationUpdate}
                onManualLocationPick={() => setShowManualLocationPicker(true)}
                isUpdatingLocation={isUpdatingLocation}
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/20"
                aria-hidden
              />
              {!userLocation &&
                (!selectedCityFromStorage || selectedCityFromStorage === "Current Location") && (
                  <div className="absolute bottom-3 left-3 right-3 z-20 max-w-md rounded-xl border border-zinc-200/80 bg-white/95 p-3 shadow-lg backdrop-blur-sm sm:left-auto sm:right-4">
                    <p className="mb-2 text-xs text-muted-foreground">
                      Enable location or pick a city in the header for nearby results. The map still works for browsing.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="w-full sm:w-auto"
                      onClick={() => setShowManualLocationPicker(true)}
                    >
                      Pick location
                    </Button>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Search bar — reference-style panel; live filter + submit scrolls to results */}
        <div className="container relative z-30 -mt-8 px-4 sm:-mt-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              document.getElementById("explore-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="app-surface flex flex-col gap-4 rounded-2xl border border-zinc-200/90 px-4 py-4 shadow-xl sm:rounded-3xl sm:px-8 sm:py-5"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold sm:text-xl">Find everything you need</h2>
                <p className="text-sm text-muted-foreground">
                  Search by title, category, or description — results update as you type.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:max-w-xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    name="explore-search"
                    placeholder="Search on Itemile"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-11 rounded-xl border-zinc-200 bg-zinc-50/80 pl-10 pr-3 text-sm focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Search listings and posts"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-11 shrink-0 rounded-xl bg-zinc-900 px-6 text-white hover:bg-zinc-800"
                >
                  Search
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-3 lg:hidden">
              <Button
                type="button"
                variant={selectedCategory === "" ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => setSelectedCategory("")}
              >
                All
              </Button>
              {categoryCounts.map((category) => (
                <Button
                  type="button"
                  key={category.value}
                  variant={selectedCategory === category.value ? "default" : "outline"}
                  size="sm"
                  className="gap-1 rounded-full"
                  onClick={() => setSelectedCategory(category.value)}
                >
                  <category.icon className="h-3.5 w-3.5" />
                  <span className="max-w-[120px] truncate">{category.name}</span>
                </Button>
              ))}
            </div>
          </form>
        </div>
      </div>

      <div className="container space-y-14 px-4 py-6 sm:py-10">
        {/* Shop-style listings */}
        <section id="explore-results" className="scroll-mt-24" aria-label="Browse listings">
          <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
            <aside className="hidden w-full shrink-0 lg:block lg:w-60 xl:w-64">
              <div className="app-surface sticky top-24 space-y-1 border border-zinc-200/90 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Category
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedCategory("")}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                    selectedCategory === ""
                      ? "bg-rose-50 font-semibold text-rose-900 ring-1 ring-rose-200"
                      : "hover:bg-zinc-50"
                  )}
                >
                  <span>All listings</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "shrink-0 text-xs",
                      selectedCategory === "" ? "bg-rose-200/80 text-rose-950" : ""
                    )}
                  >
                    {totalShopCount}
                  </Badge>
                </button>
                <div className="my-2 border-t border-zinc-100" />
                {categoryCounts.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setSelectedCategory(cat.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                      selectedCategory === cat.value
                        ? "bg-rose-50 font-medium text-rose-900 ring-1 ring-rose-200"
                        : "hover:bg-zinc-50"
                    )}
                  >
                    <cat.icon className="h-4 w-4 shrink-0 opacity-70" />
                    <span className="min-w-0 flex-1 truncate">{cat.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{cat.count}</span>
                  </button>
                ))}
                <Collapsible className="border-t border-zinc-100 pt-3">
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm font-medium hover:bg-zinc-50 [&[data-state=open]>svg]:rotate-180">
                    Sort &amp; more
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 pt-1">
                    <button
                      type="button"
                      onClick={() => setShopSort("new")}
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-left text-sm",
                        shopSort === "new" ? "bg-zinc-100 font-medium" : "hover:bg-zinc-50"
                      )}
                    >
                      New arrivals
                    </button>
                    <button
                      type="button"
                      onClick={() => setShopSort("popular")}
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-left text-sm",
                        shopSort === "popular" ? "bg-zinc-100 font-medium" : "hover:bg-zinc-50"
                      )}
                    >
                      Most popular
                    </button>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              <div className="mb-4 lg:hidden">
                <p className="text-sm text-muted-foreground">
                  {totalShopCount} listings · use category chips under the search bar to filter
                </p>
              </div>

              {paginatedShopItems.length === 0 ? (
                <div className="app-surface rounded-2xl border border-dashed border-zinc-200 p-10 text-center">
                  <p className="text-muted-foreground">No listings match your search or filters.</p>
                  <Button
                    type="button"
                    variant="link"
                    className="mt-2"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedCategory("");
                    }}
                  >
                    Clear search and filters
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {paginatedShopItems.map((post) => {
                      if (post.type === "listing") {
                        const listing = post.data as Listing;
                        const likes = listing.likes?.length ?? 0;
                        const rent = listing.price?.rentPerDay ?? listing.rentPerDay;
                        return (
                          <Card
                            key={listing.id}
                            className="group overflow-hidden border-zinc-200/90 bg-zinc-50/50 shadow-sm transition-shadow hover:shadow-md"
                          >
                            <div className="relative aspect-square bg-zinc-100">
                              <img
                                src={listing.images?.[0] || "/placeholder.svg"}
                                alt={listing.title}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                                }}
                              />
                              <Badge className="absolute right-2 top-2 rounded-full border-0 bg-white/95 px-2.5 py-0.5 text-xs font-medium text-zinc-800 shadow-sm">
                                {listing.category || "Item"}
                              </Badge>
                              {listing.swapAllowed && (
                                <Badge className="absolute left-2 top-2 bg-emerald-600 text-[10px] text-white">
                                  SWAP
                                </Badge>
                              )}
                            </div>
                            <CardContent className="space-y-2 p-4">
                              <h3 className="line-clamp-2 font-semibold leading-snug">{listing.title}</h3>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                <span>
                                  {likes > 0 ? `${likes} interested` : "New listing"}
                                </span>
                              </div>
                              <p className="text-lg font-bold tracking-tight">
                                {formatCurrency(rent)}
                                <span className="text-sm font-normal text-muted-foreground"> / day</span>
                              </p>
                              <div className="flex gap-2 pt-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-10 flex-1 rounded-xl border-zinc-900 bg-white text-zinc-900 hover:bg-zinc-50"
                                  onClick={() => navigate(`/item/${listing.id}`)}
                                >
                                  View
                                </Button>
                                <Button
                                  type="button"
                                  className="h-10 flex-1 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800"
                                  onClick={() => navigate(`/item/${listing.id}`)}
                                >
                                  Rent now
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      }
                      const business = post.data as {
                        ownerId: string;
                        businessName: string;
                        listingCount: number;
                        listings: Listing[];
                        featuredListing: Listing;
                      };
                      const feat = business.featuredListing;
                      const img = feat?.images?.[0] || "/placeholder.svg";
                      return (
                        <Card
                          key={`biz-${business.ownerId}`}
                          className="group overflow-hidden border-zinc-200/90 bg-zinc-50/50 shadow-sm transition-shadow hover:shadow-md"
                        >
                          <div className="relative aspect-square bg-zinc-100">
                            <img
                              src={img}
                              alt={business.businessName}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder.svg";
                              }}
                            />
                            <Badge className="absolute right-2 top-2 rounded-full bg-white/95 text-xs font-medium text-zinc-800 shadow-sm">
                              Shop
                            </Badge>
                          </div>
                          <CardContent className="space-y-2 p-4">
                            <h3 className="line-clamp-2 font-semibold leading-snug">{business.businessName}</h3>
                            <p className="text-xs text-muted-foreground sm:text-sm">
                              {business.listingCount} items · tap to browse the store
                            </p>
                            <div className="flex gap-2 pt-1">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-10 flex-1 rounded-xl border-zinc-900 bg-white"
                                onClick={() => navigate(`/vendor/${business.ownerId}`)}
                              >
                                View shop
                              </Button>
                              <Button
                                type="button"
                                className="h-10 flex-1 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800"
                                onClick={() => navigate(`/vendor/${business.ownerId}`)}
                              >
                                See items
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {totalListingsPages > 1 && (
                    <nav
                      className="mt-10 flex flex-wrap items-center justify-center gap-2"
                      aria-label="Listing pages"
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1 rounded-full"
                        disabled={listingsPage <= 1}
                        onClick={() => setListingsPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      {Array.from({ length: totalListingsPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          type="button"
                          variant={listingsPage === page ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "min-w-[2.25rem] rounded-full",
                            listingsPage === page ? "bg-zinc-900 text-white hover:bg-zinc-800" : ""
                          )}
                          onClick={() => setListingsPage(page)}
                        >
                          {page}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1 rounded-full"
                        disabled={listingsPage >= totalListingsPages}
                        onClick={() => setListingsPage((p) => Math.min(totalListingsPages, p + 1))}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </nav>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* Community feed */}
        <section aria-label="Community posts">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              Community posts
            </h2>
            <Badge variant="secondary" className="w-fit text-xs sm:text-sm">
              {filteredPosts.length} updates
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div className="lg:col-span-3">
          {/* Info Cards explaining different post types */}
          {!searchTerm && filteredPosts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card className="border-0 bg-blue-50 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Grid3x3 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1">Items for Rent</h3>
                      <p className="text-sm text-muted-foreground">
                        View available items.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 bg-blue-50 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1">Requests</h3>
                      <p className="text-sm text-muted-foreground">
                        View what people need.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {loading ? (
            <div className="space-y-6">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-32 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No posts found</p>
              {currentUser && (
                <Button onClick={() => setShowPostDialog(true)}>
                  Create First Post
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredPosts.map((post) => {
                if (post.type === 'message') {
                  const messagePost = post.data as MessagePost;
                  const isLiked = currentUser && messagePost.likes?.includes(currentUser.uid);
                  
                  return (
                    <Card key={messagePost.id} className="rounded-2xl border border-border/60 shadow-sm hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 sm:p-5 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                              <AvatarImage src={messagePost.userPhotoUrl} />
                              <AvatarFallback className="text-xs sm:text-sm">{messagePost.userName.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm sm:text-base">{messagePost.userName}</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">{formatDate(messagePost.createdAt)}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
                            <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                        
                        <div className="rounded-2xl border border-border/40 bg-muted/30 p-4 sm:p-5">
                          <p className="text-sm sm:text-base mb-3">{messagePost.message}</p>
                        
                          {messagePost.images && messagePost.images.length > 0 && (
                            <div className={`grid gap-2 ${
                              messagePost.images.length === 1 ? 'grid-cols-1' :
                              messagePost.images.length === 2 ? 'grid-cols-2' :
                              messagePost.images.length === 3 ? 'grid-cols-2 sm:grid-cols-3' :
                              messagePost.images.length === 4 ? 'grid-cols-2' :
                              'grid-cols-2 sm:grid-cols-3'
                            }`}>
                              {messagePost.images.slice(0, 6).map((img, idx) => (
                                <div 
                                  key={idx}
                                  className={`relative overflow-hidden rounded-2xl bg-muted ${
                                    messagePost.images.length === 1 ? 'aspect-[4/3] max-h-[500px]' :
                                    'aspect-square'
                                  }`}
                                >
                                  <img
                                    src={img}
                                    alt={`Post image ${idx + 1}`}
                                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                                    onClick={() => messagePost.listingId && navigate(`/item/${messagePost.listingId}`)}
                                    loading="lazy"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = '/placeholder.svg';
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 sm:gap-4 pt-2 border-t flex-wrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLike(messagePost.id, 'message')}
                            className={`h-8 sm:h-9 text-xs sm:text-sm ${isLiked ? "text-red-500" : ""}`}
                          >
                            <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 ${isLiked ? "fill-red-500" : ""}`} />
                            {messagePost.likes?.length || 0}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCommentingPostId(commentingPostId === messagePost.id ? null : messagePost.id);
                              setCommentingPostType(commentingPostId === messagePost.id ? null : 'message');
                            }}
                            className="h-8 sm:h-9 text-xs sm:text-sm"
                          >
                            <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                            {messagePost.comments?.length || 0}
                          </Button>
                          
                          {messagePost.listingId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/item/${messagePost.listingId}`)}
                              className="h-8 sm:h-9 text-xs sm:text-sm"
                            >
                              View Item
                            </Button>
                          )}
                        </div>
                        
                        {/* Comments Section */}
                        {commentingPostId === messagePost.id && commentingPostType === 'message' && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
                              {messagePost.comments?.map((comment) => (
                                <div key={comment.id} className="flex gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={comment.userPhotoUrl} />
                                    <AvatarFallback>{comment.userName.charAt(0).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <p className="text-sm">
                                      <span className="font-semibold">{comment.userName}</span> {comment.text}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <div className="flex gap-2">
                              <Input
                                placeholder="Add a comment..."
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && commentText.trim()) {
                                    handleAddComment(messagePost.id, 'message');
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleAddComment(messagePost.id, 'message')}
                                disabled={!commentText.trim()}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                } else if (post.type === 'business') {
                  const business = post.data as { 
                    ownerId: string; 
                    ownerName: string; 
                    businessName: string; 
                    listingCount: number; 
                    listings: Listing[]; 
                    featuredListing: Listing;
                  };
                  const owner = owners[business.ownerId];
                  
                  return (
                    <Card 
                      key={`business-${business.ownerId}`} 
                      className="rounded-2xl border border-border/60 shadow-sm hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/vendor/${business.ownerId}`)}
                    >
                      <CardContent className="p-4 sm:p-5 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 sm:h-14 sm:w-14">
                              <AvatarImage src={owner?.profilePhotoUrl} />
                              <AvatarFallback className="bg-primary/20 text-primary text-lg">
                                <Building2 className="h-6 w-6" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-base sm:text-lg">{business.businessName}</p>
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                                  <Building2 className="h-3 w-3 mr-1" />
                                  Business
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{business.ownerName}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(business.featuredListing.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="rounded-2xl border border-border/40 bg-muted/30 p-4">
                          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                            {business.featuredListing.images && business.featuredListing.images.length > 0 ? (
                              <div className="w-full sm:w-32 aspect-square overflow-hidden rounded-2xl bg-muted">
                                <img
                                  src={business.featuredListing.images[0]}
                                  alt={business.featuredListing.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/placeholder.svg';
                                  }}
                                />
                              </div>
                            ) : null}
                            
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary" className="bg-white text-foreground border">
                                  {business.featuredListing.category}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {business.listingCount} {business.listingCount === 1 ? 'item' : 'items'} available
                                </Badge>
                              </div>
                              <p className="font-semibold text-base sm:text-lg">{business.featuredListing.title}</p>
                              <p className="text-sm text-muted-foreground line-clamp-2">{business.featuredListing.description}</p>
                              <p className="text-base font-semibold text-primary">{formatCurrency(business.featuredListing.rentPerDay)}/day</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t">
                          <p className="text-sm text-muted-foreground">
                            View all {business.listingCount} {business.listingCount === 1 ? 'item' : 'items'} from this vendor
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/vendor/${business.ownerId}`);
                            }}
                          >
                            <ArrowRight className="h-4 w-4 mr-2" />
                            View Store
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                } else if (post.type === 'listing') {
                  const listing = post.data as Listing;
                  const isLiked = currentUser && listing.likes?.includes(currentUser.uid);
                  
                  return (
                    <Card key={listing.id} className="rounded-2xl border border-border/60 shadow-sm hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-primary/20 text-primary">
                                <MapPin className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">New listing available</p>
                              <p className="text-xs text-muted-foreground">{formatDate(listing.createdAt)}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="rounded-2xl border border-border/40 bg-muted/30 p-4">
                          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                            {listing.images && listing.images.length > 0 ? (
                              <div className="w-full sm:w-32 aspect-square overflow-hidden rounded-2xl bg-muted">
                                <img
                                  src={listing.images[0]}
                                  alt={listing.title}
                                  className="w-full h-full object-cover"
                                  onClick={() => navigate(`/item/${listing.id}`)}
                                  loading="lazy"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/placeholder.svg';
                                  }}
                                />
                              </div>
                            ) : null}
                            
                            <div className="flex-1 space-y-2">
                              <Badge variant="secondary" className="bg-white text-foreground border">
                                {listing.category}
                              </Badge>
                              <p className="font-semibold text-lg">{listing.title}</p>
                              <p className="text-sm text-muted-foreground line-clamp-2">{listing.description}</p>
                              <p className="text-base font-semibold text-primary">{formatCurrency(listing.rentPerDay)}/day</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 pt-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLike(listing.id, 'listing');
                            }}
                            className={isLiked ? "text-red-500" : ""}
                          >
                            <Heart className={`h-4 w-4 mr-2 ${isLiked ? "fill-red-500" : ""}`} />
                            {listing.likes?.length || 0}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCommentingPostId(commentingPostId === listing.id ? null : listing.id);
                              setCommentingPostType(commentingPostId === listing.id ? null : 'listing');
                            }}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            {listing.comments?.length || 0}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/item/${listing.id}`);
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                        
                        {/* Comments Section */}
                        {commentingPostId === listing.id && commentingPostType === 'listing' && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
                              {listing.comments?.map((comment) => (
                                <div key={comment.id} className="flex gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={comment.userPhotoUrl} />
                                    <AvatarFallback>{comment.userName.charAt(0).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <p className="text-sm">
                                      <span className="font-semibold">{comment.userName}</span> {comment.text}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <div className="flex gap-2">
                              <Input
                                placeholder="Add a comment..."
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && commentText.trim()) {
                                    handleAddComment(listing.id, 'listing');
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleAddComment(listing.id, 'listing')}
                                disabled={!commentText.trim()}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                } else {
                  const request = post.data as Request;
                  const isLiked = currentUser && request.likes?.includes(currentUser.uid);
                  
                  return (
                    <Card key={request.id} className="rounded-2xl border border-border/60 shadow-sm hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-primary/20 text-primary">
                                <MessageCircle className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">Item request</p>
                              <p className="text-xs text-muted-foreground">{formatDate(request.createdAt)}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="rounded-2xl border border-border/40 bg-muted/30 p-4">
                          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                            <div className="flex-1 space-y-2 w-full">
                              <Badge variant="secondary" className="bg-white text-foreground border">
                                {request.category}
                              </Badge>
                              <p className="font-semibold text-lg">{request.itemName}</p>
                              <p className="text-sm text-muted-foreground">{request.description}</p>
                              {request.maxBudget && (
                                <span className="text-sm font-semibold text-primary">Up to {formatCurrency(request.maxBudget)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 pt-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLike(request.id, 'request');
                            }}
                            className={isLiked ? "text-red-500" : ""}
                          >
                            <Heart className={`h-4 w-4 mr-2 ${isLiked ? "fill-red-500" : ""}`} />
                            {request.likes?.length || 0}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCommentingPostId(commentingPostId === request.id ? null : request.id);
                              setCommentingPostType(commentingPostId === request.id ? null : 'request');
                            }}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            {request.comments?.length || 0}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/requests#${request.id}`);
                            }}
                          >
                            View Request
                          </Button>
                        </div>
                        
                        {/* Comments Section */}
                        {commentingPostId === request.id && commentingPostType === 'request' && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
                              {request.comments?.map((comment) => (
                                <div key={comment.id} className="flex gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={comment.userPhotoUrl} />
                                    <AvatarFallback>{comment.userName.charAt(0).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <p className="text-sm">
                                      <span className="font-semibold">{comment.userName}</span> {comment.text}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <div className="flex gap-2">
                              <Input
                                placeholder="Add a comment..."
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && commentText.trim()) {
                                    handleAddComment(request.id, 'request');
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleAddComment(request.id, 'request')}
                                disabled={!commentText.trim()}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                }
              })}
            </div>
          )}
          </div>
          
          {/* Safety Tips Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Safety Tips</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Meet in public places (malls, cafes) for exchanges.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Inspect items thoroughly before accepting them.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Use Itemile chat for all payments and messages.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        </section>
      </div>

      {/* Post Creation Dialog */}
      <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create a Post</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <textarea
              placeholder="What's your rental need?"
              value={postMessage}
              onChange={(e) => setPostMessage(e.target.value)}
              className="w-full min-h-[150px] p-3 border rounded-md resize-none"
            />
            
            {postImageUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {postImageUrls.map((url, idx) => (
                  <div key={idx} className="relative">
                    <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-32 object-cover rounded-lg" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removeImage(idx)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <span className="text-sm text-muted-foreground hover:text-primary">Add Image</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </label>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPostDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePost}
              disabled={posting || (!postMessage.trim() && postImages.length === 0)}
              className="bg-green-600 hover:bg-green-700"
            >
              {posting ? "Posting..." : "Post"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TermsNotification
        open={showTermsDialog}
        onAccept={handleAcceptTerms}
        onRequestClose={(open) => {
          if (!open && !termsAccepted) {
            setShowTermsDialog(true);
            return;
          }
          setShowTermsDialog(open);
        }}
      />

      {/* Manual Location Picker Dialog */}
      <Dialog open={showManualLocationPicker} onOpenChange={setShowManualLocationPicker}>
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Pick Your Location Manually</DialogTitle>
            <DialogDescription>
              Click on the map to set your location. You can also drag the marker to adjust it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <LocationPickerMap
              value={manualLocation || null}
              onChange={(coords) => setManualLocation(coords)}
            />
            {manualLocation && (
              <div className="text-sm text-muted-foreground">
                Selected: {manualLocation.lat.toFixed(6)}, {manualLocation.lng.toFixed(6)}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowManualLocationPicker(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (manualLocation) {
                    setUserLocation(manualLocation);
                    setLocationAccuracy(0); // Manual location has perfect accuracy
                    setShowManualLocationPicker(false);
                    toast({
                      title: "Location Set",
                      description: "Your location has been set manually.",
                    });
                  }
                }}
                disabled={!manualLocation}
              >
                Use This Location
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Explore;
