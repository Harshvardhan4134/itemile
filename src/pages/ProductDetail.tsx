import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Calendar as CalendarIcon,
  Shield,
  Clock,
  Heart,
  Share2,
  MessageCircle,
  User,
  ChevronLeft,
  ChevronRight,
  Navigation,
  ExternalLink,
  CheckCircle
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { getListing, getUser, createTransactionAndChat, createNotification, Listing, User as UserType, getReviewsByUser, Review } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { getCityNameFromCoordinates } from "@/lib/utils";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [listing, setListing] = useState<Listing | null>(null);
  const [owner, setOwner] = useState<UserType | null>(null);
  const [ownerReviews, setOwnerReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityName, setCityName] = useState<string>('');

  useEffect(() => {
    const fetchListingData = async () => {
      if (!id) {
        navigate('/explore');
        return;
      }

      try {
        setLoading(true);
        const listingData = await getListing(id);
        
        if (!listingData) {
          toast({
            title: "Item not found",
            description: "The item you're looking for doesn't exist.",
            variant: "destructive"
          });
          navigate('/explore');
          return;
        }

        setListing(listingData);

        // Fetch city name from coordinates
        if (listingData.location) {
          const city = await getCityNameFromCoordinates(
            listingData.location.latitude, 
            listingData.location.longitude
          );
          setCityName(city);
        }

        // Fetch owner data
        const ownerData = await getUser(listingData.ownerId);
        setOwner(ownerData);

        // Fetch owner reviews
        if (ownerData) {
          const reviews = await getReviewsByUser(listingData.ownerId);
          setOwnerReviews(reviews);
        }
      } catch (error) {
        console.error('Error fetching listing:', error);
        toast({
          title: "Error",
          description: "Failed to load item details. Please try again.",
          variant: "destructive"
        });
        navigate('/explore');
      } finally {
        setLoading(false);
      }
    };

    fetchListingData();
  }, [id, navigate, toast]);

  const handleContact = async () => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    if (!listing || !owner) {
      toast({
        title: "Error",
        description: "Unable to start chat. Please try again.",
        variant: "destructive"
      });
      return;
    }

    try {
      const ownerId = listing.ownerId;
      const currentUserId = auth.currentUser.uid;
      
      if (ownerId === currentUserId) {
        toast({
          title: "Cannot contact yourself",
          description: "You cannot start a chat with yourself",
          variant: "destructive"
        });
        return;
      }

      // Create transaction and chat together
      const { transactionId, chatId } = await createTransactionAndChat(listing, currentUserId);

      // Create notification for the owner
      await createNotification({
        userId: ownerId,
        type: 'rental_request',
        transactionId: transactionId,
        message: `${auth.currentUser.displayName || 'Someone'} contacted you about "${listing.title}"`,
        read: false
      });
      
      navigate(`/chat/${chatId}`);
      
      toast({
        title: "Chat started",
        description: "You can now message the owner about this item"
      });
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: "Error",
        description: "Failed to start chat. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRequestRent = async () => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    if (!listing || !owner) {
      toast({
        title: "Error",
        description: "Unable to process rental request. Please try again.",
        variant: "destructive"
      });
      return;
    }

    if (listing.ownerId === auth.currentUser.uid) {
      toast({
        title: "Cannot rent your own item",
        description: "You cannot rent an item that you own.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedDate) {
      toast({
        title: "Please select a date",
        description: "You need to select a rental date before requesting.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create transaction and chat together
      const { transactionId, chatId } = await createTransactionAndChat(listing, auth.currentUser.uid);

      // Create notification for the owner
      await createNotification({
        userId: listing.ownerId,
        type: 'rental_request',
        transactionId: transactionId,
        message: `${auth.currentUser.displayName || 'Someone'} requested to rent "${listing.title}"`,
        read: false
      });

      toast({
        title: "Rental request sent!",
        description: "Your rental request has been sent to the owner."
      });

      // Navigate to chat page
      navigate(`/chat/${chatId}`);
    } catch (error) {
      console.error('Error creating rental request:', error);
      toast({
        title: "Error",
        description: "Failed to send rental request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleProposeSwap = async () => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    if (!listing || !owner) {
      toast({
        title: "Error",
        description: "Unable to process swap request. Please try again.",
        variant: "destructive"
      });
      return;
    }

    if (listing.ownerId === auth.currentUser.uid) {
      toast({
        title: "Cannot swap with yourself",
        description: "You cannot propose a swap for your own item.",
        variant: "destructive"
      });
      return;
    }

    if (!listing.swapAllowed) {
      toast({
        title: "Swap not allowed",
        description: "The owner of this item does not allow swapping.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create transaction and chat together
      const { transactionId, chatId } = await createTransactionAndChat(listing, auth.currentUser.uid);

      // Create notification for the owner
      await createNotification({
        userId: listing.ownerId,
        type: 'swap_proposal',
        transactionId: transactionId,
        message: `${auth.currentUser.displayName || 'Someone'} proposed a swap for "${listing.title}"`,
        read: false
      });

      toast({
        title: "Swap proposal sent!",
        description: "Your swap proposal has been sent to the owner."
      });

      // Navigate to chat page
      navigate(`/chat/${chatId}`);
    } catch (error) {
      console.error('Error creating swap proposal:', error);
      toast({
        title: "Error",
        description: "Failed to send swap proposal. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleShare = async () => {
    if (!listing) return;

    const shareData = {
      title: listing.title,
      text: `Check out this item: ${listing.title} - ₹${listing.rentPerDay}/day`,
      url: window.location.href
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({
          title: "Shared successfully!",
          description: "The item has been shared."
        });
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied!",
          description: "The item link has been copied to your clipboard."
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied!",
          description: "The item link has been copied to your clipboard."
        });
      } catch (clipboardError) {
        toast({
          title: "Share failed",
          description: "Unable to share or copy the link. Please try again.",
          variant: "destructive"
        });
      }
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
              <p className="text-muted-foreground">Loading item details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!listing || !owner) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Item not found</h1>
            <p className="text-muted-foreground mb-6">The item you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/explore')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Explore
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === listing.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? listing.images.length - 1 : prev - 1
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-6">
        {/* Back Button */}
        <Link 
          to="/explore" 
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Explore
        </Link>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden glass-card">
              <img 
                src={listing.images[currentImageIndex] || "/placeholder.svg"} 
                alt={listing.title}
                className="w-full h-full object-cover"
              />
              
              {listing.images.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 glass-effect"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 glass-effect"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
              
              <div className="absolute top-4 right-4 flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="glass-effect hover-scale"
                  onClick={() => setIsLiked(!isLiked)}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="glass-effect hover-scale"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Video Display */}
            {listing.videoProof && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">360° Video Proof</h3>
                <div className="relative rounded-lg overflow-hidden">
                  <video 
                    src={listing.videoProof} 
                    controls
                    className="w-full h-64 object-cover rounded-lg"
                    preload="metadata"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            )}
            
            {/* Thumbnail Gallery */}
            {listing.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {listing.images.map((image, index) => (
                  <button
                    key={index}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentImageIndex 
                        ? 'border-primary shadow-lg' 
                        : 'border-transparent hover:border-border'
                    }`}
                    onClick={() => setCurrentImageIndex(index)}
                  >
                    <img 
                      src={image || "/placeholder.svg"} 
                      alt={`${listing.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <Badge className="mb-3" variant="secondary">{listing.category}</Badge>
              <h1 className="text-3xl font-urbanist font-bold mb-3">{listing.title}</h1>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                  <span className="font-semibold">{owner.rating || 4.5}</span>
                  <span className="text-muted-foreground ml-1">(reviews)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-1" />
                    {cityName || (listing.location ? 'Loading location...' : 'Location not available')}
                  </div>
                  {listing.location && (
                    <button 
                      onClick={() => {
                        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${listing.location.latitude},${listing.location.longitude}`;
                        window.open(googleMapsUrl, '_blank');
                      }}
                      className="flex items-center text-primary hover:text-primary/80 transition-colors cursor-pointer"
                      title="Get Directions"
                    >
                      <Navigation className="h-5 w-5" />
                      <ExternalLink className="h-4 w-4 ml-1" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="text-3xl font-urbanist font-bold text-primary mb-6">
                ₹{listing.rentPerDay}/day
              </div>
            </div>

            {/* Owner Info */}
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      {owner.profilePhotoUrl ? (
                        <img 
                          src={owner.profilePhotoUrl} 
                          alt={owner.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{owner.name}</h3>
                        {owner.verified && (
                          <CheckCircle className="h-4 w-4 text-blue-500 fill-blue-500" title="Verified User" />
                        )}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                        {owner.rating.toFixed(1)} ({ownerReviews.length} {ownerReviews.length === 1 ? 'review' : 'reviews'})
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="glass-effect"
                    onClick={handleContact}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Contact
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Booking Section */}
            <Card className="glass-card">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Select Rental Dates</h3>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal glass-effect"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? (
                        selectedDate.toDateString()
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Daily rate</span>
                    <span>₹{listing.rentPerDay}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Service fee</span>
                    <span>₹5</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>₹{listing.rentPerDay + 5}</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full mt-4 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                  onClick={handleRequestRent}
                >
                  Request to Rent
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full mt-2 glass-effect"
                  onClick={handleProposeSwap}
                  disabled={!listing.swapAllowed}
                >
                  Propose a Swap
                </Button>
              </CardContent>
            </Card>

            {/* Features */}
            <Card className="glass-card">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Features & Specifications</h3>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3" />
                    Category: {listing.category}
                  </li>
                  <li className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-primary rounded-full mr-3" />
                    Available: {listing.available ? 'Yes' : 'No'}
                  </li>
                  {listing.swapAllowed && (
                    <li className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3" />
                      Swap allowed
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Description */}
        <div className="mt-8 grid lg:grid-cols-2 gap-8">
          <Card className="glass-card">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Description</h3>
              <p className="text-muted-foreground leading-relaxed">
                {listing.description}
              </p>
              
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Availability</h4>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-2" />
                  {listing.available ? 'Available for rent' : 'Currently unavailable'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Rental Policies</h3>
              <ul className="space-y-3">
                <li className="flex items-start text-sm">
                  <Shield className="h-4 w-4 mr-3 mt-0.5 text-primary flex-shrink-0" />
                  Must be returned in same condition
                </li>
                <li className="flex items-start text-sm">
                  <Shield className="h-4 w-4 mr-3 mt-0.5 text-primary flex-shrink-0" />
                  24-hour minimum rental
                </li>
                <li className="flex items-start text-sm">
                  <Shield className="h-4 w-4 mr-3 mt-0.5 text-primary flex-shrink-0" />
                  Security deposit may be required
                </li>
                {listing.swapAllowed && (
                  <li className="flex items-start text-sm">
                    <Shield className="h-4 w-4 mr-3 mt-0.5 text-primary flex-shrink-0" />
                    Item swapping is allowed
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Owner Reviews Section */}
        <div className="mt-8">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-xl">Owner Reviews</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    See what others are saying about {owner.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-2xl font-bold">{owner.rating.toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ownerReviews.length} {ownerReviews.length === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>
                </div>
              </div>

              {ownerReviews.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No reviews yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Be the first to rent from this owner and leave a review!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ownerReviews.slice(0, 5).map((review) => (
                    <Card key={review.id} className="glass-card border-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                            {review.reviewerPhotoUrl ? (
                              <img 
                                src={review.reviewerPhotoUrl} 
                                alt={review.reviewerName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="h-5 w-5 text-white" />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h4 className="font-semibold text-sm">{review.reviewerName}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {review.createdAt?.toDate().toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-3.5 w-3.5 ${
                                      star <= review.rating
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2">
                              Rented: <span className="font-medium text-foreground">{review.listingTitle}</span>
                            </p>
                            
                            <p className="text-sm">{review.comment}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {ownerReviews.length > 5 && (
                    <div className="text-center pt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing 5 of {ownerReviews.length} reviews
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;