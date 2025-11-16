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
              <div className="hidden md:flex gap-2">
                <Button variant="outline">Rent</Button>
                <Button>Chat</Button>
              </div>
            </div>

            {/* Real tabs */}
            <TabsList className="mt-4">
              <TabsTrigger value="listings">Listings</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="favorites">Favorites</TabsTrigger>
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
                    <Button variant="secondary" className="w-full justify-center">Add bio</Button>
                    <Button variant="secondary" className="w-full justify-center">Edit info</Button>
                    <Button variant="secondary" className="w-full justify-center">Add interests</Button>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardHeader><CardTitle>Images</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      {myListings.slice(0, 6).map((l) => (
                        <img key={l.id} src={l.images?.[0] || '/placeholder.svg'} alt={l.title} className="w-full h-20 object-cover rounded-md"
                          onError={(e) => { const t = e.currentTarget as HTMLImageElement; t.src = '/placeholder.svg'; }} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="md:col-span-2 space-y-6">
                <Card className="glass-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {user.profilePhotoUrl ? <img src={user.profilePhotoUrl} alt={user.name} className="w-full h-full object-cover" /> : <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>}
                      </Avatar>
                      <div className="flex-1"><Input placeholder="What's your rental need?" /></div>
                      <Button size="sm" variant="secondary">Upgrade plan</Button>
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-muted-foreground">
                      <Button variant="ghost" size="icon"><Image className="h-5 w-5" /></Button>
                      <Button variant="ghost" size="icon"><MapPin className="h-5 w-5" /></Button>
                      <Button variant="ghost" size="icon"><Smile className="h-5 w-5" /></Button>
                    </div>
                  </CardContent>
                </Card>
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
