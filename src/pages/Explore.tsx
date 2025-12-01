import { useState, useEffect } from "react";
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
  TrendingUp,
  Sparkles,
  ArrowRight,
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
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import TermsNotification from "@/components/TermsNotification";
import { uploadMultipleImages } from "@/lib/cloudinary";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const TERMS_VERSION = "2025-11";
const buildTermsKey = (uid?: string | null) =>
  `termsAccepted:${TERMS_VERSION}:${uid ?? "anonymous"}`;

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

const Explore = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<Listing | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [listings, setListings] = useState<Listing[]>([]);
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

        setListings(listingsData);
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
            } else if (accuracy > MAX_ACCEPTABLE_ACCURACY) {
              console.warn('⚠️ Location accuracy too poor:', accuracy + 'm');
              setIsUpdatingLocation(false);
              setAttemptedGeolocation(true);
              toast({
                title: "Location Accuracy Low",
                description: `GPS accuracy is ±${Math.round(accuracy/1000)}km. You can use manual location picker for better accuracy.`,
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
    
    // Start watching position for better accuracy
    // This will wait until GPS chip locks and provides good accuracy (<10km)
    // Browsers sometimes return IP-based location first (poor accuracy), so we wait for GPS
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const accuracy = pos.coords.accuracy;
        const timestamp = pos.timestamp;
        const altitude = pos.coords.altitude;
        const heading = pos.coords.heading;
        const speed = pos.coords.speed;
        
        // Reject only very poor locations (accuracy > 10km = 10000m)
        // Note: Browsers sometimes return IP-based location first (10km-150km accuracy)
        // before GPS chip locks. We wait for better accuracy.
        const MAX_ACCEPTABLE_ACCURACY = 10000; // 10km - reject anything worse than this
        
        if (accuracy > MAX_ACCEPTABLE_ACCURACY) {
          // Only log once per session to reduce console noise
          // This is expected - browser may return IP-based location first before GPS locks
          if (locationCount === 0) {
            console.warn(`⚠️ Initial location has poor accuracy (${Math.round(accuracy)}m), waiting for GPS to lock...`);
          }
          return; // Don't use this location, wait for better GPS signal
        }
        
        // Log detailed location info only for accepted locations (reduced verbosity)
        if (locationCount === 0 || accuracy < 100) {
          console.log(`📍 Location update ${locationCount + 1}:`, {
            coordinates: coords,
            accuracy: `±${Math.round(accuracy)}m`,
            source: 'GPS (watchPosition)'
          });
        }
        
        // This is GPS data (from watchPosition), so it's valid GPS even if accuracy is moderate
        // GPS accuracy can vary: excellent (<20m), good (20-100m), moderate (100-1000m), poor (>1000m)
        // We accept all GPS locations up to 10km accuracy
        
        if (!isValidCoordinate(coords.lat, coords.lng)) {
          console.error('❌ Invalid coordinates received:', coords);
          return;
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
    // Only attempt location on initial mount
    // IMPORTANT: Always get fresh GPS location, never use database location
    if (!attemptedGeolocation) {
      // Clear any existing location to ensure we get fresh GPS data
      setUserLocation(null);
      setLocationAccuracy(null);
      handleLocationUpdate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setListings(listingsData);
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
        setListings(listingsData);
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

  // Combine all posts (listings, requests, message posts) and sort by date
  const allPosts = [
    ...listings.map(listing => ({ type: 'listing' as const, data: listing, createdAt: listing.createdAt })),
    ...requests.map(request => ({ type: 'request' as const, data: request, createdAt: request.createdAt })),
    ...messagePosts.map(post => ({ type: 'message' as const, data: post, createdAt: post.createdAt }))
  ].sort((a, b) => {
    const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
    const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
    return bTime - aTime; // Newest first
  });

  // Filter posts
  const filteredPosts = allPosts.filter(post => {
    if (post.type === 'message') {
      const messagePost = post.data as MessagePost;
      return messagePost.message.toLowerCase().includes(searchTerm.toLowerCase());
    } else if (post.type === 'listing') {
      const listing = post.data as Listing;
      const matchesSearch = listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           listing.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           listing.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || listing.category === selectedCategory;
      return matchesSearch && matchesCategory;
    } else {
      const request = post.data as Request;
      const matchesSearch = request.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           request.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || request.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }
  });

  // Featured listings for hero section
  const featuredListings = listings.slice(0, 6);
  const categoryCounts = categories.map(cat => ({
    ...cat,
    count: listings.filter(l => l.category === cat.value).length
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-4 sm:py-6">
        {/* Map Container - Replaces Hero Banner */}
        <Card className="mb-6 sm:mb-8">
          <CardContent className="p-2 sm:p-4">
            <div className="h-[300px] sm:h-[400px] md:h-[500px] rounded-lg overflow-hidden border border-border">
              {loading ? (
                <div className="h-full w-full bg-muted/20 flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-muted-foreground">Loading map...</p>
                  </div>
                </div>
              ) : attemptedGeolocation ? (
                <div className="relative h-full w-full">
                  <LiveMap 
                    listings={listings}
                    requests={requests}
                    onListingSelect={setSelectedItem}
                    center={userLocation || { lat: 37.7749, lng: -122.4194 }}
                    zoom={userLocation ? 15 : 12}
                    userLocation={userLocation}
                    onLocationUpdate={handleLocationUpdate}
                    onManualLocationPick={() => setShowManualLocationPicker(true)}
                    isUpdatingLocation={isUpdatingLocation}
                  />
                  {!userLocation && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                      <div className="bg-white rounded-lg p-6 max-w-md mx-4 text-center">
                        <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">GPS Location Not Available</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          We couldn't get your GPS location. Please pick your location manually on the map.
                        </p>
                        <Button onClick={() => setShowManualLocationPicker(true)}>
                          Pick Location Manually
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full w-full bg-muted/20 flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-muted-foreground">Getting your location...</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Search and Filter Bar */}
        <div className="mb-6 sm:mb-8 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="What's your rental need?"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 sm:h-12 text-sm sm:text-base"
              />
            </div>
            <div className="flex gap-2 sm:gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0">
            <Button
              variant={selectedCategory === "" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("")}
              className="text-xs sm:text-sm whitespace-nowrap h-8 sm:h-9"
            >
              All Categories
            </Button>
            {categoryCounts.map((category) => (
              <Button
                key={category.value}
                variant={selectedCategory === category.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.value)}
                className="gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap h-8 sm:h-9"
              >
                <category.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{category.name}</span>
                <span className="sm:hidden">{category.name.split(' ')[0]}</span>
                {category.count > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] sm:text-xs">
                    {category.count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>


        {/* Featured Items Section */}
        {!searchTerm && !selectedCategory && (
          <div className="mb-8 sm:mb-12">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <h2 className="text-xl sm:text-2xl font-bold">Featured Items</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {featuredListings.map((listing) => (
                <Card key={listing.id} className="group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden">
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <img
                      src={listing.images[0] || "/placeholder.svg"}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    {listing.swapAllowed && (
                      <Badge className="absolute top-2 right-2 bg-green-500">
                        SWAP
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3 sm:p-4">
                    <h3 className="font-semibold text-base sm:text-lg mb-1 line-clamp-1">{listing.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 line-clamp-2">{listing.description}</p>
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div>
                        <span className="text-xl sm:text-2xl font-bold text-primary">₹{listing.rentPerDay}</span>
                        <span className="text-xs sm:text-sm text-muted-foreground">/day</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">{listing.category}</Badge>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => navigate(`/item/${listing.id}`)}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Community Posts Section - All Posts (Listings, Requests, Message Posts) */}
        <div>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold">
              Community Posts
            </h2>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {filteredPosts.length} posts
            </span>
          </div>

          {/* Info Cards explaining different post types */}
          {!searchTerm && filteredPosts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Items for Rent/Swap</h3>
                    <p className="text-sm text-muted-foreground">
                      Browse items available to rent or swap. Click to view details and book!
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Item Requests</h3>
                    <p className="text-sm text-muted-foreground">
                      People looking for items. If you have what they need, click "I Have This Item" to respond!
                    </p>
                  </div>
                </div>
              </div>
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
                    <Card key={messagePost.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start justify-between mb-2 sm:mb-3">
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
                        
                        <p className="mb-2 sm:mb-3 text-sm sm:text-base">{messagePost.message}</p>
                        
                        {messagePost.images && messagePost.images.length > 0 && (
                          <div className={`grid gap-2 mb-2 sm:mb-3 ${
                            messagePost.images.length === 1 ? 'grid-cols-1' :
                            messagePost.images.length === 2 ? 'grid-cols-2' :
                            messagePost.images.length === 3 ? 'grid-cols-2 sm:grid-cols-3' :
                            messagePost.images.length === 4 ? 'grid-cols-2' :
                            'grid-cols-2 sm:grid-cols-3'
                          }`}>
                            {messagePost.images.slice(0, 6).map((img, idx) => (
                              <div 
                                key={idx}
                                className={`relative overflow-hidden rounded-lg bg-muted ${
                                  messagePost.images.length === 1 ? 'aspect-[4/3] max-h-[500px]' :
                                  messagePost.images.length === 2 ? 'aspect-square' :
                                  messagePost.images.length === 3 ? 'aspect-square' :
                                  messagePost.images.length === 4 ? 'aspect-square' :
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
                } else if (post.type === 'listing') {
                  const listing = post.data as Listing;
                  const isLiked = currentUser && listing.likes?.includes(currentUser.uid);
                  
                  return (
                    <Card key={listing.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
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
                        
                        <p className="mb-2 font-semibold text-lg">{listing.title}</p>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{listing.description}</p>
                        
                        {listing.images && listing.images.length > 0 && (
                          <div className={`grid gap-2 mb-3 ${
                            listing.images.length === 1 ? 'grid-cols-1' :
                            listing.images.length === 2 ? 'grid-cols-2' :
                            listing.images.length === 3 ? 'grid-cols-3' :
                            listing.images.length === 4 ? 'grid-cols-2' :
                            'grid-cols-3'
                          }`}>
                            {listing.images.slice(0, 6).map((img, idx) => (
                              <div 
                                key={idx}
                                className={`relative overflow-hidden rounded-lg bg-muted ${
                                  listing.images.length === 1 ? 'aspect-[4/3] max-h-[500px]' :
                                  listing.images.length === 2 ? 'aspect-square' :
                                  listing.images.length === 3 ? 'aspect-square' :
                                  listing.images.length === 4 ? 'aspect-square' :
                                  'aspect-square'
                                }`}
                              >
                                <img
                                  src={img}
                                  alt={listing.title}
                                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                                  onClick={() => navigate(`/item/${listing.id}`)}
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
                        
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="secondary">{listing.category}</Badge>
                          <span className="text-sm font-semibold text-primary">₹{listing.rentPerDay}/day</span>
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
                    <Card key={request.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
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
                        
                        <p className="mb-2 font-semibold text-lg">{request.itemName}</p>
                        <p className="text-sm text-muted-foreground mb-3">{request.description}</p>
                        
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="secondary">{request.category}</Badge>
                          {request.maxBudget && (
                            <span className="text-sm text-muted-foreground">Up to ₹{request.maxBudget}</span>
                          )}
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
