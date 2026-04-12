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
  CheckCircle,
  RefreshCw,
  HelpCircle
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { auth } from "@/lib/firebase";
import { getListing, getUser, createTransactionAndChat, createNotification, Listing, User as UserType, getReviewsByUser, Review, getActiveTransactionsForListing, updateTransaction, getBookingsForListing, Transaction, sendEmailNotification, getTransaction } from "@/lib/firestore";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getCityNameFromCoordinates } from "@/lib/utils";
import TenureSelector, { BookingData } from "@/components/TenureSelector";
import PaymentDialog from "@/components/PaymentDialog";
import BookingCalendar from "@/components/BookingCalendar";
import UserAgreementDialog from "@/components/UserAgreementDialog";
import { passesVerificationGate } from "@/lib/verificationPolicy";

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
  const [isInRent, setIsInRent] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [isRequestingRent, setIsRequestingRent] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showAgreementDialog, setShowAgreementDialog] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [pendingTransactionId, setPendingTransactionId] = useState<string | null>(null);
  const [pendingChatId, setPendingChatId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Transaction[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    const fetchListingData = async () => {
      if (!id) {
        setLoading(false);
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
          setListing(null);
          setOwner(null);
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

        // Check if item is currently in rent (has active transaction)
        // This requires authentication, so we'll try it but handle errors gracefully
        try {
          const activeTransactions = await getActiveTransactionsForListing(listingData.id);
          setIsInRent(activeTransactions.length > 0);
          
          // Also fetch all bookings for calendar view
          const allBookings = await getBookingsForListing(listingData.id);
          setBookings(allBookings);
        } catch (error) {
          // If we can't check transaction status (user not authenticated or permission issue),
          // just assume it's not in rent - this won't break the page
          console.warn('Could not check if item is in rent:', error);
          setIsInRent(false);
          setBookings([]);
        }
      } catch (error) {
        console.error('Error fetching listing:', error);
        toast({
          title: "Error",
          description: "Failed to load item details. Please try again.",
          variant: "destructive"
        });
        setListing(null);
        setOwner(null);
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

    // Validate booking data
    if (!bookingData || !bookingData.startDate || !bookingData.endDate) {
      toast({
        title: "Please select rental dates",
        description: "You need to select start date and duration before requesting.",
        variant: "destructive"
      });
      return;
    }

    // Progressive verification check - require verification only at checkout
    // Users can browse but need verification to rent
    const currentUser = await getUser(auth.currentUser.uid);
    if (!passesVerificationGate(currentUser)) {
      toast({
        title: "Verification Required",
        description: "Please complete your verification to rent items. You can browse items without verification, but verification is required to complete a rental.",
        variant: "destructive"
      });
      navigate('/profile?tab=verification');
      return;
    }

    // Validate SecurePay requirement
    if (bookingData.requiresSecurePay && bookingData.deposit === 0) {
      toast({
        title: "Deposit Required",
        description: "This item requires a deposit. SecurePay payment is mandatory for items valued ₹5,000 or more.",
        variant: "destructive"
      });
      return;
    }

    setIsRequestingRent(true);

    try {
      // Create transaction and chat together with booking data
      const { transactionId, chatId } = await createTransactionAndChat(
        listing, 
        auth.currentUser.uid,
        {
          durationType: bookingData.durationType,
          startDate: bookingData.startDate,
          endDate: bookingData.endDate,
          units: bookingData.units,
          rentPerUnit: bookingData.rentPerUnit,
          totalRent: bookingData.totalRent,
          deposit: bookingData.deposit,
          serviceFee: bookingData.serviceFee,
          requiresSecurePay: bookingData.requiresSecurePay,
        }
      );

      setPendingTransactionId(transactionId);
      setPendingChatId(chatId);
      
      // Show agreement dialog and complete booking without payment
      setShowAgreementDialog(true);
    } catch (error: any) {
      console.error('Error creating rental request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send rental request. Please try again.",
        variant: "destructive"
      });
      setIsRequestingRent(false);
    }
  };

  const handlePaymentCancelled = async () => {
    if (!pendingTransactionId) return;

    try {
      // Mark the transaction as cancelled
      await updateTransaction(pendingTransactionId, {
        status: 'cancelled',
        cancelledAt: new Date(),
      });

      // Refresh bookings to update calendar
      if (listing) {
        const allBookings = await getBookingsForListing(listing.id);
        setBookings(allBookings);
        
        const activeTransactions = await getActiveTransactionsForListing(listing.id);
        setIsInRent(activeTransactions.length > 0);
      }

      // Clear pending transaction
      setPendingTransactionId(null);
      setPendingChatId(null);
    } catch (error) {
      console.error('Error cancelling transaction:', error);
    }
  };

  const handlePaymentComplete = async (
    paymentMethod: 'SecurePay' | 'online' | 'offline',
    razorpayResponse?: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string },
    agreementAcceptedFromDialog?: boolean
  ) => {
    if (!pendingTransactionId) return;

    try {
      // Use the agreement acceptance from the agreement dialog
      const finalAgreementAccepted = agreementAccepted || agreementAcceptedFromDialog || false;
      
      // Update transaction with payment information
      const transactionUpdate: any = {
        paymentMode: paymentMethod,
        status: paymentMethod === 'offline' ? 'pending' : 'pending', // Keep as pending until owner approves (OTP will be generated)
        agreementAccepted: finalAgreementAccepted,
        agreementAcceptedAt: finalAgreementAccepted ? new Date() : null,
      };

      // Add Razorpay payment details if available
      if (razorpayResponse) {
        transactionUpdate.razorpayPaymentId = razorpayResponse.razorpay_payment_id;
        transactionUpdate.razorpayOrderId = razorpayResponse.razorpay_order_id;
        transactionUpdate.razorpaySignature = razorpayResponse.razorpay_signature;
        transactionUpdate.paymentStatus = 'completed';
        transactionUpdate.paidAt = new Date();
      }

      await updateTransaction(pendingTransactionId, transactionUpdate);

      // Create notification for the owner
      if (listing) {
        await createNotification({
          userId: listing.ownerId,
          type: 'rental_request',
          transactionId: pendingTransactionId,
          message: `${auth.currentUser?.displayName || 'Someone'} ${paymentMethod === 'offline' ? 'requested to rent' : 'rented'} "${listing.title}"`,
          read: false
        });

        // Send email notification to owner
        try {
          const owner = await getUser(listing.ownerId);
          if (owner?.email && bookingData) {
            await sendEmailNotification({
              email: owner.email,
              subject: `New Booking ${paymentMethod === 'offline' ? 'Request' : 'Confirmed'}! 🎉 - Rent Share`,
              message: `Hi ${owner.name},\n\nYou've received a ${paymentMethod === 'offline' ? 'new booking request' : 'new booking'}!\n\nListing: ${listing.title}\nBooked by: ${auth.currentUser?.displayName || 'A user'}\nDuration: ${bookingData.units} ${bookingData.durationType}\nAmount: ₹${bookingData.totalRent}\nDeposit: ₹${bookingData.deposit}\nTotal: ₹${bookingData.payableNow}\n\n${bookingData.startDate ? `Start Date: ${format(bookingData.startDate, 'MMM dd, yyyy')}\nEnd Date: ${format(bookingData.endDate || bookingData.startDate, 'MMM dd, yyyy')}\n` : ''}\nPlease review and manage this booking in your dashboard.\n\nView Booking: ${window.location.origin}/owner-bookings\n\nBest regards,\nRent Share Team`,
              type: 'rental_request',
              read: false,
              createdAt: new Date(),
            });
          }
        } catch (error) {
          console.error('Error sending email notification:', error);
          // Don't fail the booking if email fails
        }
      }

      toast({
        title: paymentMethod === 'offline' ? "Booking Request Sent!" : "Payment Successful!",
        description: paymentMethod === 'offline' 
          ? "Your booking request has been sent. Payment will be collected on delivery. Please wait for owner approval to receive your pickup OTP."
          : `Your payment of ₹${bookingData?.payableNow.toLocaleString()} has been processed successfully. Please wait for owner approval to receive your pickup OTP.`
      });

      setShowPaymentDialog(false);
      
      // Navigate to chat page to communicate with owner
      if (pendingChatId) {
        navigate(`/chat/${pendingChatId}`);
      } else {
        navigate('/transactions');
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast({
        title: "Payment Error",
        description: "Failed to process payment. Please try again.",
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
      <div className="app-shell">
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
      <div className="app-shell">
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
    <div className="app-shell">
      <Header />
      
      <div className="container py-4 sm:py-6">
        {/* Back Button */}
        <Button
          variant="outline"
          asChild
          className="mb-4 sm:mb-6 h-9 sm:h-10"
        >
          <Link to="/explore" className="inline-flex items-center text-sm sm:text-base">
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            Back to Explore
          </Link>
        </Button>

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Image Gallery */}
          <div className="space-y-3 sm:space-y-4">
            <div className="relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden glass-card">
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
                    className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 glass-effect h-8 w-8 sm:h-10 sm:w-10"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 glass-effect h-8 w-8 sm:h-10 sm:w-10"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </>
              )}
              
              <div className="absolute top-2 sm:top-4 right-2 sm:right-4 flex gap-1.5 sm:gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="glass-effect hover-scale h-8 w-8 sm:h-10 sm:w-10"
                  onClick={() => setIsLiked(!isLiked)}
                >
                  <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="glass-effect hover-scale h-8 w-8 sm:h-10 sm:w-10"
                  onClick={handleShare}
                >
                  <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
            
            {/* Video Display */}
            {listing.videoProof && (
              <div className="mt-3 sm:mt-4">
                <h3 className="text-base sm:text-lg font-semibold mb-2">360° Video Proof</h3>
                <div className="relative rounded-lg overflow-hidden">
                  <video 
                    src={listing.videoProof} 
                    controls
                    className="w-full h-48 sm:h-64 object-cover rounded-lg"
                    preload="metadata"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            )}
            
            {/* Thumbnail Gallery */}
            {listing.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0">
                {listing.images.map((image, index) => (
                  <button
                    key={index}
                    className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all ${
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
          <div className="space-y-4 sm:space-y-6">
            <div>
              <Badge className="mb-2 sm:mb-3 text-xs sm:text-sm" variant="secondary">{listing.category}</Badge>
              <h1 className="text-2xl sm:text-3xl font-urbanist font-bold mb-2 sm:mb-3">{listing.title}</h1>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                <div className="flex items-center">
                  <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400 mr-1" />
                  <span className="font-semibold text-sm sm:text-base">{owner.rating || 4.5}</span>
                  <span className="text-muted-foreground ml-1 text-xs sm:text-sm">(reviews)</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center text-muted-foreground text-xs sm:text-sm">
                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                    {cityName || (listing.location ? 'Loading location...' : 'Location not available')}
                  </div>
                  {listing.location && (
                    <Button
                      variant="default"
                      size="default"
                      onClick={() => {
                        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${listing.location.latitude},${listing.location.longitude}`;
                        window.open(googleMapsUrl, '_blank');
                      }}
                      className="bg-primary hover:bg-primary/90 text-white border-primary px-3 sm:px-4 py-1.5 sm:py-2 h-8 sm:h-9 text-xs sm:text-sm w-fit"
                      title="Get Directions"
                    >
                      <Navigation className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 text-white" />
                      Direction
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="text-2xl sm:text-3xl font-urbanist font-bold text-primary mb-4 sm:mb-6">
                ₹{listing.rentPerDay}/day
              </div>

              {/* In Rent Status Badge */}
              {isInRent && (
                <div className="mb-4">
                  <Badge className="bg-orange-500 hover:bg-orange-600 text-white mb-2">
                    Currently In Rent
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    This item is currently being rented, but you can still contact the vendor to discuss future availability.
                  </p>
                </div>
              )}
            </div>

            {/* Owner Info */}
            <Card className="glass-card">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-primary flex items-center justify-center flex-shrink-0">
                      {owner.profilePhotoUrl ? (
                        <img 
                          src={owner.profilePhotoUrl} 
                          alt={owner.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <h3 className="font-semibold text-sm sm:text-base truncate">{owner.name}</h3>
                        {owner.verified && (
                          <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 fill-blue-500 flex-shrink-0" title="Verified User" />
                        )}
                      </div>
                      <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                        {owner.rating.toFixed(1)} ({ownerReviews.length} {ownerReviews.length === 1 ? 'review' : 'reviews'})
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="glass-effect h-8 sm:h-9 flex-shrink-0"
                    onClick={handleContact}
                  >
                    <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">Contact</span>
                    <span className="sm:hidden">Chat</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Booking Section with TenureSelector */}
            <Card className="glass-card">
              <CardContent className="p-4 sm:p-6">
                {listing && (
                  <>
                    <TenureSelector 
                      listing={listing} 
                      onBookingDataChange={setBookingData}
                      disabled={isInRent || isRequestingRent}
                    />
                    
                    <Button 
                      className="w-full mt-4 bg-primary hover:bg-primary/90 h-10 sm:h-11"
                      onClick={handleRequestRent}
                      disabled={isInRent || isRequestingRent || !bookingData || !bookingData.startDate}
                    >
                      {isRequestingRent ? 'Processing...' : isInRent ? 'Currently In Rent' : 'Send Booking Request'}
                    </Button>
                    {isInRent && (
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Contact the vendor for future availability
                      </p>
                    )}
                    
                    <div className="w-full mt-2">
                      <TooltipProvider>
                        <div className="flex items-center gap-2 mb-2">
                          <Button 
                            variant="outline" 
                            className="flex-1 glass-effect h-10 sm:h-11"
                            onClick={handleProposeSwap}
                            disabled={!listing.swapAllowed || isRequestingRent}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Propose a Swap
                          </Button>
                          {listing.swapAllowed && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-10 w-10">
                                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="font-semibold mb-1">What is Swapping?</p>
                                <p className="text-xs">
                                  Exchange items with the owner instead of paying money. You offer an item you have, and they offer this item. Perfect for trying new things!
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TooltipProvider>
                      {listing.swapAllowed && (
                        <p className="text-xs text-muted-foreground text-center">
                          💡 Exchange items instead of paying - no money needed!
                        </p>
                      )}
                      {!listing.swapAllowed && (
                        <p className="text-xs text-muted-foreground text-center">
                          This item is not available for swapping
                        </p>
                      )}
                    </div>

                    {/* Calendar View Toggle */}
                    <Button
                      variant="ghost"
                      className="w-full mt-2"
                      onClick={() => setShowCalendar(!showCalendar)}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {showCalendar ? 'Hide' : 'Show'} Booking Calendar
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Booking Calendar */}
            {showCalendar && listing && (
              <BookingCalendar
                bookings={bookings}
                onDateSelect={(date) => {
                  if (bookingData) {
                    setBookingData({
                      ...bookingData,
                      startDate: date,
                    });
                  }
                }}
                selectedDate={bookingData?.startDate || undefined}
                disabled={isInRent || isRequestingRent}
              />
            )}

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
                    Status: {isInRent ? 'In Rent' : listing.available ? 'Available' : 'Unavailable'}
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
        <div className="mt-6 sm:mt-8 grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          <Card className="glass-card">
            <CardContent className="p-4 sm:p-6">
              <h3 className="font-semibold mb-3 sm:mb-4 text-base sm:text-lg">Description</h3>
              <p className="text-muted-foreground leading-relaxed">
                {listing.description}
              </p>
              
                <div className="mt-6">
                <h4 className="font-semibold mb-3">Availability</h4>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-2" />
                  {isInRent 
                    ? 'Currently in rent - Contact vendor for future availability' 
                    : listing.available 
                    ? 'Available for rent' 
                    : 'Currently unavailable'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4 sm:p-6">
              <h3 className="font-semibold mb-3 sm:mb-4 text-base sm:text-lg">Rental Policies</h3>
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
        <div className="mt-6 sm:mt-8">
          <Card className="glass-card">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div>
                  <h3 className="font-semibold text-lg sm:text-xl">Owner Reviews</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    See what others are saying about {owner.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 sm:h-5 sm:w-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-xl sm:text-2xl font-bold">{owner.rating.toFixed(1)}</span>
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
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary flex items-center justify-center flex-shrink-0">
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

      {/* Payment Dialog */}
      {/* User Agreement Dialog */}
      <UserAgreementDialog
        open={showAgreementDialog}
        onOpenChange={(open) => {
          setShowAgreementDialog(open);
          // If agreement is closed without acceptance, cancel the transaction
          if (!open && !agreementAccepted && pendingTransactionId) {
            handlePaymentCancelled();
          }
        }}
        onAccept={async () => {
          setAgreementAccepted(true);
          setShowAgreementDialog(false);
          
          // Complete booking without payment - payment will happen after OTP verification
          if (pendingTransactionId) {
            try {
              await updateTransaction(pendingTransactionId, {
                agreementAccepted: true,
                agreementAcceptedAt: new Date(),
                status: 'pending', // Stays pending until owner approves
              });

              toast({
                title: "Booking Request Sent!",
                description: "Your booking request has been sent to the owner. You will receive an OTP after approval. Payment will be collected after you verify the OTP at pickup.",
              });

              setIsRequestingRent(false);
              setPendingTransactionId(null);
              setPendingChatId(null);
              
              // Navigate to transactions page
              navigate('/transactions');
            } catch (error: any) {
              console.error('Error completing booking:', error);
              toast({
                title: "Error",
                description: error.message || "Failed to complete booking. Please try again.",
                variant: "destructive"
              });
            }
          }
        }}
      />

      {listing && (
        <PaymentDialog
          open={showPaymentDialog}
          onOpenChange={async (open) => {
            setShowPaymentDialog(open);
            // If dialog is closed without payment completion, cancel the transaction
            if (!open && pendingTransactionId) {
              // Check if transaction was actually completed (has payment info)
              // If not, cancel it
              try {
                const transaction = await getTransaction(pendingTransactionId);
                if (transaction && !transaction.paymentStatus && transaction.status === 'pending') {
                  await handlePaymentCancelled();
                }
              } catch (error) {
                console.error('Error checking transaction status:', error);
              }
            }
          }}
          bookingData={bookingData}
          listingTitle={listing.title}
          ownerId={listing.ownerId}
          transactionId={pendingTransactionId || undefined}
          onPaymentComplete={handlePaymentComplete}
          onPaymentCancelled={handlePaymentCancelled}
          isProcessing={isRequestingRent}
          agreementAccepted={agreementAccepted}
        />
      )}
    </div>
  );
};

export default ProductDetail;