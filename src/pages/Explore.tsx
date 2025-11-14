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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link, useNavigate } from "react-router-dom";
import LiveMap from "@/components/LiveMap";
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
  getListing
} from "@/lib/firestore";
import { 
  MapPin, 
  Search, 
  Heart,
  MessageCircle,
  MoreVertical,
  Send,
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
  const [listings, setListings] = useState<Listing[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [messagePosts, setMessagePosts] = useState<MessagePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [attemptedGeolocation, setAttemptedGeolocation] = useState(false);
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
      setAttemptedGeolocation(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setAttemptedGeolocation(true);
      },
      (err) => {
        if (err.code !== err.PERMISSION_DENIED) {
          console.warn('Error getting current position:', err.message || err);
        }
        setAttemptedGeolocation(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    handleLocationUpdate();
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

  // Combine all posts and sort by date
  const allPosts = [
    ...listings.map(listing => ({ type: 'listing' as const, data: listing, createdAt: listing.createdAt })),
    ...requests.map(request => ({ type: 'request' as const, data: request, createdAt: request.createdAt })),
    ...messagePosts.map(post => ({ type: 'message' as const, data: post, createdAt: post.createdAt }))
  ].sort((a, b) => {
    const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
    const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
    return bTime - aTime; // Newest first
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Scrollable Container - Everything scrolls together */}
      <div className="overflow-y-auto h-[calc(100vh-4rem)]">
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
          {/* Search Bar and Map Container */}
          <Card>
            <CardContent className="p-4">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="What's your rental need?"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Map Container */}
              <div className="h-[400px] rounded-lg overflow-hidden border border-border">
                {loading ? (
                  <div className="h-full w-full bg-muted/20 flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-muted-foreground">Loading map...</p>
                    </div>
                  </div>
                ) : attemptedGeolocation ? (
                  <LiveMap 
                    listings={listings}
                    requests={requests}
                    onListingSelect={setSelectedItem}
                    center={userLocation || { lat: 37.7749, lng: -122.4194 }}
                    zoom={12}
                    userLocation={userLocation}
                    onLocationUpdate={handleLocationUpdate}
                  />
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

          {/* Posts Feed */}
          <div className="space-y-4">
          {allPosts.map((post) => {
            if (post.type === 'message') {
              const messagePost = post.data as MessagePost;
              const isLiked = currentUser && messagePost.likes?.includes(currentUser.uid);
              
              return (
                <Card key={messagePost.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={messagePost.userPhotoUrl} />
                          <AvatarFallback>{messagePost.userName.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{messagePost.userName}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(messagePost.createdAt)}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <p className="mb-3">{messagePost.message}</p>
                    
                    {messagePost.images && messagePost.images.length > 0 && (
                      <div className={`grid gap-3 mb-3 ${
                        messagePost.images.length === 1 ? 'grid-cols-1' :
                        messagePost.images.length === 2 ? 'grid-cols-2' :
                        'grid-cols-3'
                      }`}>
                        {messagePost.images.slice(0, 5).map((img, idx) => (
                          <div 
                            key={idx}
                            className={`relative overflow-hidden rounded-xl ${
                              messagePost.images.length === 1 ? 'h-[400px]' :
                              messagePost.images.length === 2 ? 'h-[300px]' :
                              'h-[200px]'
                            }`}
                          >
                            <img
                              src={img}
                              alt={`Post image ${idx + 1}`}
                              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                              onClick={() => messagePost.listingId && navigate(`/item/${messagePost.listingId}`)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(messagePost.id, 'message')}
                        className={isLiked ? "text-red-500" : ""}
                      >
                        <Heart className={`h-4 w-4 mr-2 ${isLiked ? "fill-red-500" : ""}`} />
                        {messagePost.likes?.length || 0}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCommentingPostId(commentingPostId === messagePost.id ? null : messagePost.id);
                          setCommentingPostType(commentingPostId === messagePost.id ? null : 'message');
                        }}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        {messagePost.comments?.length || 0}
                      </Button>
                      
                      {messagePost.listingId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/item/${messagePost.listingId}`)}
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
                      <div className={`grid gap-3 mb-3 ${
                        listing.images.length === 1 ? 'grid-cols-1' :
                        listing.images.length === 2 ? 'grid-cols-2' :
                        'grid-cols-3'
                      }`}>
                        {listing.images.slice(0, 5).map((img, idx) => (
                          <div 
                            key={idx}
                            className={`relative overflow-hidden rounded-xl ${
                              listing.images.length === 1 ? 'h-[450px]' :
                              listing.images.length === 2 ? 'h-[350px]' :
                              'h-[250px]'
                            }`}
                          >
                            <img
                              src={img}
                              alt={listing.title}
                              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                              onClick={() => navigate(`/item/${listing.id}`)}
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
        </div>
      </div>

      {/* Post Creation Dialog */}
      <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
        <DialogContent className="max-w-2xl">
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
    </div>
  );
};

export default Explore;
