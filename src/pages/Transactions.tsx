import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  getTransactionsByParticipant, 
  updateTransaction,
  updateTransactionStatus,
  deleteTransaction,
  getChatByTransactionId,
  Transaction,
  getListing,
  getUser,
  getListings,
  Listing,
  User,
  canUserReview
} from "@/lib/firestore";
import TransactionMap from "@/components/TransactionMap";
import LiveMap from "@/components/LiveMap";
import { auth } from "@/lib/firebase";
import { 
  DollarSign, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  User as UserIcon,
  Package,
  MessageCircle,
  MapPin,
  Star
} from "lucide-react";
import ReviewDialog from "@/components/ReviewDialog";

const Transactions = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("active");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Record<string, Listing>>({});
  const [users, setUsers] = useState<Record<string, User>>({});
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedTransactionForReview, setSelectedTransactionForReview] = useState<Transaction | null>(null);
  const [revieweeInfo, setRevieweeInfo] = useState<{ id: string; name: string } | null>(null);
  const [canReview, setCanReview] = useState<Record<string, boolean>>({});

  const fetchTransactions = async () => {
    if (!auth.currentUser) return;

    try {
      setLoading(true);
      
      // Fetch all transactions where user is a participant
      console.log('Fetching transactions for user:', auth.currentUser.uid);
      const allTransactions = await getTransactionsByParticipant(auth.currentUser.uid);
      console.log('Found transactions:', allTransactions);

      setTransactions(allTransactions);

      // Fetch related listings and users
      const listingIds = [...new Set(allTransactions.map(t => t.listingId).filter(id => id))];
      const userIds = [...new Set(allTransactions.flatMap(t => [t.ownerId, t.renterId]))];

      const [listingData, userData] = await Promise.all([
        Promise.all(listingIds.map(id => getListing(id))),
        Promise.all(userIds.map(id => getUser(id)))
      ]);

      const listingsMap: Record<string, Listing> = {};
      const usersMap: Record<string, User> = {};

      listingData.forEach(listing => {
        if (listing) listingsMap[listing.id] = listing;
      });

      userData.forEach(user => {
        if (user) usersMap[user.uid] = user;
      });

      setListings(listingsMap);
      setUsers(usersMap);

      // Check which transactions can be reviewed
      if (auth.currentUser) {
        const reviewChecks = await Promise.all(
          allTransactions.map(async (transaction) => ({
            id: transaction.id,
            canReview: await canUserReview(transaction.id, auth.currentUser!.uid)
          }))
        );
        
        const reviewMap: Record<string, boolean> = {};
        reviewChecks.forEach(check => {
          reviewMap[check.id] = check.canReview;
        });
        setCanReview(reviewMap);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllListings = async () => {
    try {
      const listings = await getListings();
      setAllListings(listings);
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  };

  const getUserCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationError(null);
        },
        (error) => {
          setLocationError('Location access denied. Click "Enable Location" to allow access.');
          // Don't log error for denied permission - it's expected behavior
          if (error.code !== 1) { // 1 = PERMISSION_DENIED
            console.error('Error getting location:', error);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchAllListings();
    getUserCurrentLocation();
  }, []);

  const handleStatusUpdate = async (transactionId: string, newStatus: Transaction['status']) => {
    try {
      await updateTransaction(transactionId, { status: newStatus });
      setTransactions(prev => 
        prev.map(t => t.id === transactionId ? { ...t, status: newStatus } : t)
      );
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "active": return "bg-blue-500";
      case "completed": return "bg-green-500";
      case "disputed": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const handleTransactionClick = async (transaction: Transaction) => {
    try {
      // Find the chat associated with this transaction
      const chat = await getChatByTransactionId(transaction.id, auth.currentUser?.uid);
      if (chat) {
        navigate(`/chat/${chat.id}`);
      } else {
        // If no chat found, create a new chat or go to general chat page
        console.log('No chat found for transaction, navigating to general chat');
        navigate('/chat');
      }
    } catch (error) {
      console.error('Error finding chat for transaction:', error);
      // Don't show error to user, just navigate to chat
      navigate('/chat');
    }
  };

  const handleApproveTransaction = async (transaction: Transaction) => {
    try {
      await updateTransactionStatus(transaction.id, 'active', auth.currentUser!.uid);
      // Refresh transactions by refetching
      await fetchTransactions();
    } catch (error) {
      console.error('Error approving transaction:', error);
      alert('Error approving transaction. Please try again.');
    }
  };

  const handleDeclineTransaction = async (transaction: Transaction) => {
    try {
      await updateTransactionStatus(transaction.id, 'declined', auth.currentUser!.uid);
      // Refresh transactions by refetching
      await fetchTransactions();
    } catch (error) {
      console.error('Error declining transaction:', error);
      alert('Error declining transaction. Please try again.');
    }
  };

  const handleMarkComplete = async (transaction: Transaction) => {
    try {
      await updateTransactionStatus(transaction.id, 'completed', auth.currentUser!.uid);
      // Refresh transactions by refetching
      await fetchTransactions();
    } catch (error) {
      console.error('Error marking transaction as complete:', error);
      alert('Error marking transaction as complete. Please try again.');
    }
  };

  const handleDeleteTransaction = async (transaction: Transaction) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await deleteTransaction(transaction.id, auth.currentUser!.uid);
        // Refresh transactions by refetching
        await fetchTransactions();
      } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Error deleting transaction. Please try again.');
      }
    }
  };

  const handleOpenReviewDialog = (transaction: Transaction, revieweeId: string, revieweeName: string) => {
    setSelectedTransactionForReview(transaction);
    setRevieweeInfo({ id: revieweeId, name: revieweeName });
    setReviewDialogOpen(true);
  };

  const handleReviewSubmitted = async () => {
    // Refresh transactions to update review status
    await fetchTransactions();
  };


  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "active": return <CheckCircle className="h-4 w-4" />;
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "disputed": return <AlertCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    return timestamp.toDate().toLocaleDateString();
  };

  const filteredTransactions = transactions.filter(transaction => {
    switch (activeTab) {
      case "active":
        return transaction.status === "active" || transaction.status === "pending";
      case "history":
        return transaction.status === "completed";
      case "swaps":
        return transaction.type === "swap";
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading transactions...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-urbanist font-bold mb-2">
            <span className="gradient-text">Transactions</span>
          </h1>
          <p className="text-muted-foreground">
            Manage your rental and swap transactions
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="glass-effect border-0 mb-6">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="swaps">Swaps</TabsTrigger>
            <TabsTrigger value="map">Live Map</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6">
            {filteredTransactions.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No {activeTab} transactions</h3>
                  <p className="text-muted-foreground">
                    {activeTab === "active" 
                      ? "You don't have any active transactions yet."
                      : activeTab === "history"
                      ? "Your completed transactions will appear here."
                      : "Your swap transactions will appear here."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((transaction) => {
                  const listing = listings[transaction.listingId];
                  const owner = users[transaction.ownerId];
                  const renter = users[transaction.renterId];
                  const isOwner = auth.currentUser?.uid === transaction.ownerId;

                  return (
                    <Card key={transaction.id} className="glass-card hover-scale cursor-pointer" onClick={() => handleTransactionClick(transaction)}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                              {listing?.images[0] ? (
                                <img 
                                  src={listing.images[0]} 
                                  alt={listing.title}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <Package className="h-8 w-8 text-white" />
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1">
                                {listing?.title || 'Unknown Item'}
                              </h3>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary" className="text-xs">
                                  {transaction.type.toUpperCase()}
                                </Badge>
                                <Badge className={`text-xs ${getStatusColor(transaction.status)} text-white`}>
                                  {transaction.status.toUpperCase()}
                                </Badge>
                              </div>
                              
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <UserIcon className="h-4 w-4" />
                                  <span>
                                    {isOwner 
                                      ? `Rented by ${renter?.name || 'Unknown User'}`
                                      : `Owner: ${owner?.name || 'Unknown User'}`
                                    }
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {formatDate(transaction.startDate)} - {formatDate(transaction.endDate)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4" />
                                  <span>
                                    ₹{transaction.amount} ({transaction.paymentMode})
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-3">
                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary">
                                ₹{transaction.amount}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {transaction.type === 'rent' ? 'Total Rent' : 'Swap Value'}
                              </div>
                            </div>

                            {transaction.status === "pending" && isOwner && (
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  className="bg-green-500 hover:bg-green-600"
                                  onClick={() => handleApproveTransaction(transaction)}
                                >
                                  Accept
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-red-500 border-red-500 hover:bg-red-50"
                                  onClick={() => handleDeclineTransaction(transaction)}
                                >
                                  Decline
                                </Button>
                              </div>
                            )}

                            {transaction.status === "active" && (
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleMarkComplete(transaction)}
                                >
                                  Mark Complete
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-orange-500 border-orange-500 hover:bg-orange-50"
                                  onClick={() => handleTransactionClick(transaction)}
                                >
                                  <MessageCircle className="h-4 w-4 mr-1" />
                                  Chat
                                </Button>
                              </div>
                            )}

                            {transaction.status === "pending" && !isOwner && (
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-blue-500 border-blue-500 hover:bg-blue-50"
                                  onClick={() => handleTransactionClick(transaction)}
                                >
                                  <MessageCircle className="h-4 w-4 mr-1" />
                                  Chat
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-red-500 border-red-500 hover:bg-red-50"
                                  onClick={() => handleDeleteTransaction(transaction)}
                                >
                                  Cancel Request
                                </Button>
                              </div>
                            )}

                            {transaction.status === "completed" && (
                              <div className="flex gap-2">
                                {canReview[transaction.id] && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="text-yellow-500 border-yellow-500 hover:bg-yellow-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const revieweeId = isOwner ? transaction.renterId : transaction.ownerId;
                                      const revieweeName = isOwner ? renter?.name : owner?.name;
                                      handleOpenReviewDialog(transaction, revieweeId, revieweeName || 'Unknown User');
                                    }}
                                  >
                                    <Star className="h-4 w-4 mr-1" />
                                    Review
                                  </Button>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-blue-500 border-blue-500 hover:bg-blue-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTransactionClick(transaction);
                                  }}
                                >
                                  <MessageCircle className="h-4 w-4 mr-1" />
                                  Chat
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="map" className="space-y-6">
            {/* Full Screen Map */}
            <div className="h-[calc(100vh-200px)] relative">
              <LiveMap 
                listings={allListings}
                onListingSelect={(listing) => navigate(`/item/${listing.id}`)}
                userLocation={userLocation}
                onLocationUpdate={getUserCurrentLocation}
                center={userLocation || { lat: 37.7749, lng: -122.4194 }}
                zoom={userLocation ? 15 : 12}
              />
              
              {/* Floating Items Panel */}
              <div className="absolute top-4 right-4 w-80 max-h-[calc(100vh-250px)] overflow-y-auto bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Items Near You</h3>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={getUserCurrentLocation}
                      className="text-blue-500 border-blue-500 hover:bg-blue-50"
                    >
                      <MapPin className="h-4 w-4 mr-1" />
                      Update
                    </Button>
                  </div>
                  
                  {userLocation ? (
                    <p className="text-sm text-muted-foreground mb-4">
                      Showing items near your location ({userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)})
                    </p>
                  ) : locationError ? (
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-red-600">{locationError}</p>
                      <Button 
                        size="sm" 
                        onClick={getUserCurrentLocation}
                        className="bg-blue-500 hover:bg-blue-600 w-full"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Enable Location
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-4">Getting your location...</p>
                  )}
                  
                  <div className="space-y-3">
                    {allListings.length === 0 ? (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No items found</h3>
                        <p className="text-muted-foreground text-sm">
                          No rental items are available at the moment.
                        </p>
                      </div>
                    ) : (
                      allListings.slice(0, 8).map((listing) => (
                        <Card key={listing.id} className="hover-scale cursor-pointer" onClick={() => navigate(`/item/${listing.id}`)}>
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                                {listing.images[0] ? (
                                  <img 
                                    src={listing.images[0]} 
                                    alt={listing.title}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <Package className="h-5 w-5 text-white" />
                                )}
                              </div>
                              
                              <div className="flex-1">
                                <h3 className="font-semibold text-sm mb-1">
                                  {listing.title}
                                </h3>
                                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                  {listing.description}
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-primary text-sm">
                                    ₹{listing.rentPerDay}/day
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    {listing.category}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Dialog */}
      {selectedTransactionForReview && revieweeInfo && (
        <ReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          transaction={selectedTransactionForReview}
          revieweeId={revieweeInfo.id}
          revieweeName={revieweeInfo.name}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
    </div>
  );
};

export default Transactions;
