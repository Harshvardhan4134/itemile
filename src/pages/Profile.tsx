import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Star, 
  Edit, 
  Settings, 
  LogOut, 
  Heart, 
  Package, 
  Image,
  DollarSign,
  Camera,
  Save,
  X,
  Calendar,
  Eye,
  MessageCircle,
  Trash2,
  HelpCircle,
  CheckCircle,
  RefreshCw,
  Search,
  Clock,
  Tag,
  Smile
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { getUser, updateUser, updateUserProfilePhoto, getListingsByOwner, deleteListing, updateListing, User as UserType, Listing, getReviewsByUser, Review, getRequestsByUser, Request, deleteRequest, getChatByRequestId } from "@/lib/firestore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { KYCVerification } from "@/components/KYCVerification";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<UserType | null>(null);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myRequests, setMyRequests] = useState<Request[]>([]);
  const [savedListings, setSavedListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [editListingForm, setEditListingForm] = useState({
    title: '',
    description: '',
    rentPerDay: 0,
    category: '',
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fetchUserData = async () => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Fetching fresh user data from Firestore...');
      const userData = await getUser(auth.currentUser.uid);
      console.log('📦 Received user data:', userData);
      console.log('✅ Verified status:', userData?.verified);
      console.log('📋 Verification status:', userData?.verificationStatus);
      
      if (userData) {
        setUser(userData);
        setEditForm({
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
        });
      }
    } catch (error) {
      console.error('❌ Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh profile data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchUserData();
      
      if (auth.currentUser) {
        try {
          // Fetch user's listings
          const listings = await getListingsByOwner(auth.currentUser.uid);
          setMyListings(listings);

          // Fetch user's requests
          const userRequests = await getRequestsByUser(auth.currentUser.uid);
          setMyRequests(userRequests);

          // Fetch user's reviews
          const userReviews = await getReviewsByUser(auth.currentUser.uid);
          setReviews(userReviews);

          // TODO: Implement saved listings functionality
          setSavedListings([]);
        } catch (error) {
          console.error('Error fetching additional data:', error);
          toast({
            title: "Error",
            description: "Failed to load some profile data",
            variant: "destructive"
          });
        }
      }
    };
    
    loadData();
  }, [navigate, toast]);

  const handleEditProfile = async () => {
    if (!auth.currentUser) return;

    try {
      await updateUser(auth.currentUser.uid, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
      });

      setUser(prev => prev ? { ...prev, ...editForm } : null);
      setEditing(false);
      
      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    }
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploadingPhoto(true);
      
      // Upload to Cloudinary
      const result = await uploadToCloudinary(file, 'rent-share/profile-photos');
      
      // Update user profile photo URL in Firestore
      await updateUserProfilePhoto(auth.currentUser.uid, result.secure_url);
      
      // Update local state
      setUser(prev => prev ? { ...prev, profilePhotoUrl: result.secure_url } : null);
      
      toast({
        title: "Success",
        description: "Profile photo updated successfully"
      });
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      toast({
        title: "Error",
        description: "Failed to upload profile photo",
        variant: "destructive"
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
      toast({
        title: "Logged out",
        description: "You have been successfully logged out"
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive"
      });
    }
  };

  const handleEditListing = (listing: Listing) => {
    setEditingListing(listing);
    setEditListingForm({
      title: listing.title,
      description: listing.description,
      rentPerDay: listing.rentPerDay,
      category: listing.category,
    });
  };

  const handleUpdateListing = async () => {
    if (!editingListing) return;

    try {
      await updateListing(editingListing.id, {
        title: editListingForm.title,
        description: editListingForm.description,
        rentPerDay: editListingForm.rentPerDay,
        category: editListingForm.category,
      });

      // Refresh listings
      const listings = await getListingsByOwner(auth.currentUser!.uid);
      setMyListings(listings);

      setEditingListing(null);
      toast({
        title: "Success",
        description: "Listing updated successfully",
      });
    } catch (error) {
      console.error('Error updating listing:', error);
      toast({
        title: "Error",
        description: "Failed to update listing",
        variant: "destructive"
      });
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (window.confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      try {
        await deleteListing(listingId, auth.currentUser!.uid);
        
        // Refresh listings
        const listings = await getListingsByOwner(auth.currentUser!.uid);
        setMyListings(listings);

        toast({
          title: "Success",
          description: "Listing deleted successfully",
        });
      } catch (error) {
        console.error('Error deleting listing:', error);
        toast({
          title: "Error",
          description: "Failed to delete listing",
          variant: "destructive"
        });
      }
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (window.confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
      try {
        await deleteRequest(requestId, auth.currentUser!.uid);
        
        // Refresh requests
        const requests = await getRequestsByUser(auth.currentUser!.uid);
        setMyRequests(requests);

        toast({
          title: "Success",
          description: "Request deleted successfully",
        });
      } catch (error) {
        console.error('Error deleting request:', error);
        toast({
          title: "Error",
          description: "Failed to delete request",
          variant: "destructive"
        });
      }
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    return timestamp.toDate().toLocaleDateString();
  };

  const formatLocation = (location: any) => {
    if (!location || !location.latitude || !location.longitude) return 'Location not specified';
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  };

  const handleViewChat = async (requestId: string) => {
    if (!auth.currentUser) {
      toast({
        title: "Authentication required",
        description: "Please log in to view chats",
        variant: "destructive"
      });
      return;
    }

    try {
      const chat = await getChatByRequestId(requestId, auth.currentUser.uid);
      if (chat) {
        navigate(`/chat/${chat.id}`);
      } else {
        // Fallback to chat inbox if specific chat not found
        navigate('/chat');
      }
    } catch (error) {
      console.error('Error finding chat:', error);
      // Fallback to chat inbox
      navigate('/chat');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Profile not found</h1>
            <Button onClick={() => navigate('/explore')}>
              Back to Explore
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Cover banner */}
      <div className="relative w-full h-44 md:h-60 lg:h-64 bg-muted/50">
        <img
          src="/placeholder.svg"
          alt="cover"
          className="w-full h-full object-cover opacity-80"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent h-16" />
      </div>

      {/* Tabs wrapper over header + content */}
      <div className="container -mt-10 md:-mt-12 relative z-10">
        <Tabs defaultValue="details">
          <div className="bg-background/80 backdrop-blur rounded-xl border p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-16 w-16 md:h-20 md:w-20 ring-4 ring-background">
                    {user.profilePhotoUrl ? (
                      <img src={user.profilePhotoUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <label
                    htmlFor="profile-photo-upload"
                    className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors"
                    title="Change profile photo"
                  >
                    <Camera className="h-4 w-4" />
                  </label>
                  <input
                    id="profile-photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoUpload}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-urbanist font-bold">{user.name}</h1>
                    {user.verified && <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-blue-500 fill-blue-500" />}
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground text-sm">
                    <span>{user.email}</span>
                    <span>•</span>
                    <span className="flex items-center">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                      {user.rating.toFixed(1)} ({reviews.length})
                    </span>
                    <span>•</span>
                    <span>{myListings.length} listings</span>
                  </div>
                </div>
              </div>
              {/* Removed Rent/Chat buttons as requested */}
            </div>

            {/* Real tabs */}
            <TabsList className="mt-4">
              <TabsTrigger value="listings">Listings</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="favorites">Favorites</TabsTrigger>
              <TabsTrigger value="verification">Verification</TabsTrigger>
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="support">Help & Support</TabsTrigger>
            </TabsList>
          </div>

          {/* Listings tab */}
          <TabsContent value="listings" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  My Listings ({myListings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myListings.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No listings yet</h3>
                    <p className="text-muted-foreground mb-4">Start by posting your first item to rent</p>
                    <Button onClick={() => navigate('/post')}>Post Your First Item</Button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myListings.map((listing) => (
                      <Card key={listing.id} className="glass-card hover-scale">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <img src={listing.images[0] || "/placeholder.svg"} alt={listing.title} className="w-full h-32 object-cover rounded-lg" />
                            <div>
                              <h3 className="font-semibold text-sm">{listing.title}</h3>
                              <p className="text-xs text-muted-foreground line-clamp-2">{listing.description}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="font-bold text-primary">₹{listing.rentPerDay}/day</span>
                                <Badge variant="secondary" className="text-xs">{listing.category}</Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/item/${listing.id}`)}>
                                  <Eye className="h-3 w-3 mr-1" /> View
                                </Button>
                                <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEditListing(listing)}>
                                  <Edit className="h-3 w-3 mr-1" /> Edit
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-50" onClick={() => handleDeleteListing(listing.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details tab (sidebar + composer + feed) */}
          <TabsContent value="details" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-6">
                <Card className="glass-card">
                  <CardHeader><CardTitle>User details</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="secondary" className="w-full justify-center" onClick={() => setEditing(true)}>Edit info</Button>
                  </CardContent>
                </Card>
              </div>
              <div className="md:col-span-2 space-y-6">
                {/* Removed composer card with input and attachment icons as requested */}
                <div className="space-y-4">
                  {myListings.slice(0, 5).map((listing) => (
                    <Card key={listing.id} className="glass-card">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-9 w-9">
                            {user.profilePhotoUrl ? <img src={user.profilePhotoUrl} alt={user.name} className="w-full h-full object-cover" /> : <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>}
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{user.name} listed a new item</div>
                              <span className="text-xs text-muted-foreground">{formatDate(listing.createdAt)}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{listing.title} — {listing.city || ''}</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                              <img src={listing.images?.[0] || '/placeholder.svg'} alt={listing.title} className="w-full h-28 object-cover rounded-md" />
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Button size="sm" variant="outline" onClick={() => navigate(`/item/${listing.id}`)}>View</Button>
                              <Button size="sm" variant="outline" onClick={() => handleEditListing(listing)}><Edit className="h-3 w-3 mr-1" /> Edit</Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Images tab */}
          <TabsContent value="images" className="mt-6">
            <Card className="glass-card">
              <CardHeader><CardTitle>Images</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {myListings.flatMap(l => l.images?.slice(0, 2) || []).slice(0, 16).map((src, idx) => (
                    <img key={idx} src={src || '/placeholder.svg'} alt="asset" className="w-full h-32 object-cover rounded-md" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Videos tab placeholder */}
          <TabsContent value="videos" className="mt-6">
            <Card className="glass-card">
              <CardHeader><CardTitle>Videos</CardTitle></CardHeader>
              <CardContent>
                <div className="text-center py-10 text-muted-foreground">No videos yet</div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Favorites tab */}
          <TabsContent value="favorites" className="mt-6">
            <Card className="glass-card">
              <CardHeader><CardTitle>Saved Rentals ({savedListings.length})</CardTitle></CardHeader>
              <CardContent>
                {savedListings.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No saved items</h3>
                    <p className="text-muted-foreground mb-4">Items you save will appear here</p>
                    <Button onClick={() => navigate('/explore')}>Explore Items</Button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedListings.map((listing) => (
                      <Card key={listing.id} className="glass-card hover-scale">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <img src={listing.images[0] || "/placeholder.svg"} alt={listing.title} className="w-full h-32 object-cover rounded-lg" />
                            <div>
                              <h3 className="font-semibold text-sm">{listing.title}</h3>
                              <p className="text-xs text-muted-foreground line-clamp-2">{listing.description}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="font-bold text-primary">₹{listing.rentPerDay}/day</span>
                                <Badge variant="secondary" className="text-xs">{listing.category}</Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Verification tab */}
          <TabsContent value="verification" className="mt-6">
            <KYCVerification 
              user={user} 
              onVerificationSubmitted={async () => {
                await fetchUserData();
              }} 
            />
          </TabsContent>

          {/* Requests tab */}
          <TabsContent value="requests" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="h-5 w-5 mr-2" />
                  My Requests ({myRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No requests yet</h3>
                    <p className="text-muted-foreground mb-4">Start by posting what you need to rent</p>
                    <Button onClick={() => navigate('/post-request')}>Post Your First Request</Button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myRequests.map((request) => (
                      <Card key={request.id} className="glass-card hover-scale">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge variant={request.matched ? "default" : "secondary"} className="text-xs">
                                {request.matched ? (<><CheckCircle className="h-3 w-3 mr-1" />Matched</>) : (<><Clock className="h-3 w-3 mr-1" />Active</>)}
                              </Badge>
                              <Button size="sm" variant="outline" className="text-red-500 border-red-500 hover:bg-red-50 p-1 h-8 w-8" onClick={() => handleDeleteRequest(request.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <div>
                              <h3 className="font-semibold text-sm">{request.itemName}</h3>
                              <p className="text-xs text-muted-foreground line-clamp-2">{request.description}</p>
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" /><span>{request.duration} days</span>
                                <Tag className="h-3 w-3 ml-2" /><span>{request.category}</span>
                              </div>
                              {request.maxBudget && (
                                <div className="flex items-center gap-2 mt-1 text-xs">
                                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">Max: ₹{request.maxBudget}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>{formatLocation(request.location)}</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-2">Posted: {formatDate(request.createdAt)}</div>
                              {request.matched && request.matchedWith && (
                                <div className="mt-3">
                                  <Button size="sm" variant="outline" className="w-full" onClick={() => { handleViewChat(request.id); }}>
                                    <MessageCircle className="h-3 w-3 mr-1" />
                                    View Messages
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews tab */}
          <TabsContent value="reviews" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2" />
                  User Reviews ({reviews.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
                    <p className="text-muted-foreground mb-4">Reviews from other users will appear here after completed transactions</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <Card key={review.id} className="glass-card">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                              {review.reviewerPhotoUrl ? (
                                <img src={review.reviewerPhotoUrl} alt={review.reviewerName} className="w-full h-full object-cover" />
                              ) : (
                                <User className="h-6 w-6 text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <h4 className="font-semibold">{review.reviewerName}</h4>
                                  <p className="text-xs text-muted-foreground">{review.createdAt?.toDate().toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center">
                                  {[1,2,3,4,5].map((star) => (
                                    <Star key={star} className={`h-4 w-4 ${star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">Transaction: <span className="font-medium text-foreground">{review.listingTitle}</span></p>
                              <p className="text-sm">{review.comment}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments tab */}
          <TabsContent value="payments" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Payments Coming Soon</h3>
                  <p className="text-muted-foreground mb-4">We're working on integrating Razorpay for secure payments</p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Secure payment processing</p>
                    <p>• Multiple payment methods</p>
                    <p>• Transaction history</p>
                    <p>• Refund management</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings tab */}
          <TabsContent value="settings" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Account Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start glass-effect">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile Information
                  </Button>
                  <Button variant="outline" className="w-full justify-start glass-effect" onClick={() => document.getElementById('profile-photo-upload')?.click()} disabled={uploadingPhoto}>
                    <Camera className="h-4 w-4 mr-2" />
                    {uploadingPhoto ? 'Uploading...' : 'Change Profile Picture'}
                  </Button>
                  <Button variant="outline" className="w-full justify-start glass-effect">
                    <Settings className="h-4 w-4 mr-2" />
                    Privacy Settings
                  </Button>
                  <Button variant="outline" className="w-full justify-start glass-effect">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Payment Methods
                  </Button>
                  <Button variant="outline" className="w-full justify-start glass-effect">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Help & Support
                  </Button>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <LogOut className="h-5 w-5 mr-2" />
                    Account Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start glass-effect">
                    <Settings className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                  <Button variant="outline" className="w-full justify-start glass-effect">
                    <User className="h-4 w-4 mr-2" />
                    Download Data
                  </Button>
                  <Button variant="outline" className="w-full justify-start glass-effect text-destructive">
                    <X className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                  <Button variant="outline" className="w-full justify-start glass-effect text-destructive" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Support tab */}
          <TabsContent value="support" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <HelpCircle className="h-5 w-5 mr-2" />
                    Contact Support
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email Support</p>
                        <a href="mailto:rentshare11@gmail.com" className="font-medium text-primary hover:underline">rentshare11@gmail.com</a>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Our support team is available to help you with any questions or issues. We typically respond within 24 hours.</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageCircle className="h-5 w-5 mr-2" />
                    FAQ
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm mb-1">How do I post an item?</h4>
                      <p className="text-sm text-muted-foreground">Click "Post Item" in the header and fill out the form with your item details.</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">How do I contact item owners?</h4>
                      <p className="text-sm text-muted-foreground">Click "Contact" on any item page to start a chat with the owner.</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">How do I update my profile?</h4>
                      <p className="text-sm text-muted-foreground">Go to your Profile page and click "Edit Profile" to update your information.</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">How do I upload a profile photo?</h4>
                      <p className="text-sm text-muted-foreground">Click the camera icon on your avatar or go to Settings → "Change Profile Picture".</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs preserved */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogTrigger asChild>
          <span />
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={editForm.name} onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={editForm.email} onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={editForm.phone} onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleEditProfile} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingListing} onOpenChange={() => setEditingListing(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Listing</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={editListingForm.title} onChange={(e) => setEditListingForm(prev => ({ ...prev, title: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={editListingForm.description} onChange={(e) => setEditListingForm(prev => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rentPerDay">Rent Per Day (₹)</Label>
              <Input id="rentPerDay" type="number" value={editListingForm.rentPerDay} onChange={(e) => setEditListingForm(prev => ({ ...prev, rentPerDay: Number(e.target.value) }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={editListingForm.category} onChange={(e) => setEditListingForm(prev => ({ ...prev, category: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingListing(null)}>Cancel</Button>
            <Button onClick={handleUpdateListing}><Save className="h-4 w-4 mr-2" />Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
