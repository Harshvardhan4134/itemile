import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DollarSign, 
  Package, 
  Star, 
  TrendingUp,
  Calendar,
  MapPin,
  Edit,
  Eye,
  Trash2,
  Plus,
  User,
  Settings,
  Bell,
  Clock,
  CheckCircle,
  XCircle,
  Phone
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { 
  getUser, 
  getListingsByOwner, 
  getTransactionsByParticipant,
  getReviewsByUser,
  type User as UserType,
  type Listing,
  type Transaction,
  type Review
} from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserType | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    if (!auth.currentUser) return;

    try {
      setLoading(true);
      const [userData, userListings, userTransactions, userReviews] = await Promise.all([
        getUser(auth.currentUser.uid),
        getListingsByOwner(auth.currentUser.uid),
        getTransactionsByParticipant(auth.currentUser.uid),
        getReviewsByUser(auth.currentUser.uid)
      ]);

      setUser(userData);
      setListings(userListings || []);
      setTransactions(userTransactions || []);
      setReviews(userReviews || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from real data
  const stats = {
    totalEarnings: transactions
      .filter(t => t.status === 'completed' || t.status === 'active')
      .reduce((sum, t) => sum + (t.totalRent || t.amount || 0), 0),
    activeListings: listings.filter(l => l.available && !l.softDeleted).length,
    averageRating: reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
      : 0,
    totalBookings: transactions.filter(t => t.type === 'rent').length
  };

  // Get owner bookings (where user is the owner)
  const ownerBookings = transactions
    .filter(t => t.ownerId === auth.currentUser?.uid && t.type === 'rent')
    .sort((a, b) => {
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return bDate.getTime() - aDate.getTime();
    });

  // Get top performing listings (by bookings count or views)
  const topListings = [...listings]
    .sort((a, b) => (b.bookingsCount || 0) - (a.bookingsCount || 0))
    .slice(0, 3);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "rented": return "bg-blue-500";
      case "draft": return "bg-gray-500";
      case "confirmed": return "bg-green-500";
      case "pending": return "bg-yellow-500";
      case "completed": return "bg-blue-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": 
      case "confirmed": return <CheckCircle className="h-4 w-4" />;
      case "pending": return <Clock className="h-4 w-4" />;
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "cancelled": return <XCircle className="h-4 w-4" />;
      default: return null;
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
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-urbanist font-bold mb-1 sm:mb-2">
              Welcome back, <span className="gradient-text">{user?.name || 'User'}</span>!
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your listings and track your earnings
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3 mt-4 md:mt-0">
            <Button variant="outline" size="icon" className="glass-effect">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="glass-effect">
              <Settings className="h-4 w-4" />
            </Button>
            <Link to="/owner-bookings">
              <Button variant="outline" className="glass-effect whitespace-nowrap">
                Manage Bookings
              </Button>
            </Link>
            <Link to="/post">
              <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="glass-card hover-scale">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Earnings</p>
                  <p className="text-xl sm:text-2xl font-urbanist font-bold gradient-text">
                    ₹{stats.totalEarnings.toLocaleString()}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-scale">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Active Listings</p>
                  <p className="text-xl sm:text-2xl font-urbanist font-bold">
                    {stats.activeListings}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-scale">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Average Rating</p>
                  <p className="text-xl sm:text-2xl font-urbanist font-bold flex items-center">
                    {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '0.0'}
                    <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400 ml-1" />
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                  <Star className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-scale">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Bookings</p>
                  <p className="text-xl sm:text-2xl font-urbanist font-bold">
                    {stats.totalBookings}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="glass-effect border-0 mb-4 sm:mb-6 flex-wrap h-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2">Overview</TabsTrigger>
            <TabsTrigger value="listings" className="text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2">My Listings</TabsTrigger>
            <TabsTrigger value="bookings" className="text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2">Bookings</TabsTrigger>
            <TabsTrigger value="profile" className="text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ownerBookings.length > 0 ? (
                    ownerBookings.slice(0, 3).map((booking) => {
                      const startDate = booking.startDate?.toDate ? booking.startDate.toDate() : new Date(booking.startDate || 0);
                      const endDate = booking.endDate?.toDate ? booking.endDate.toDate() : new Date(booking.endDate || 0);
                      return (
                        <div key={booking.id} className="flex items-center justify-between p-2 sm:p-3 glass-effect rounded-lg gap-2">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <div className="flex-shrink-0">{getStatusIcon(booking.status)}</div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-xs sm:text-sm truncate">{booking.listingTitle || 'Unknown Item'}</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                                {format(startDate, 'MMM dd')} - {format(endDate, 'MMM dd')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold text-xs sm:text-sm">₹{(booking.totalRent || booking.amount || 0).toLocaleString()}</p>
                            <Badge className={`text-[10px] sm:text-xs ${getStatusColor(booking.status)} text-white`}>
                              {booking.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent bookings</p>
                  )}
                </CardContent>
              </Card>

              {/* Top Performing Items */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Top Performing Items</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {topListings.length > 0 ? (
                    topListings.map((listing) => {
                      const rentPerDay = listing.price?.rentPerDay || listing.rentPerDay || 0;
                      return (
                        <div key={listing.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 glass-effect rounded-lg">
                          <img 
                            src={listing.images?.[0] || "/placeholder.svg"} 
                            alt={listing.title}
                            className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-lg flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs sm:text-sm truncate">{listing.title}</p>
                            <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground mt-1">
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {listing.bookingsCount || 0} bookings
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold text-xs sm:text-sm">₹{rentPerDay}/day</p>
                            {stats.averageRating > 0 && (
                              <div className="flex items-center text-[10px] sm:text-xs">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                                {stats.averageRating.toFixed(1)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No listings yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="listings">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>My Listings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {listings.length > 0 ? (
                    listings.map((listing) => {
                      const rentPerDay = listing.price?.rentPerDay || listing.rentPerDay || 0;
                      const status = listing.available && !listing.softDeleted ? 'active' : 'draft';
                      return (
                        <div key={listing.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 glass-effect rounded-lg hover-scale">
                          <img 
                            src={listing.images?.[0] || "/placeholder.svg"} 
                            alt={listing.title}
                            className="w-full sm:w-16 sm:h-16 h-48 sm:h-auto object-cover rounded-lg sm:flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0 w-full sm:w-auto">
                            <h3 className="font-semibold text-sm sm:text-base">{listing.title}</h3>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-1">
                              <span>₹{rentPerDay}/day</span>
                              <Badge className={`text-[10px] sm:text-xs ${getStatusColor(status)} text-white`}>
                                {status}
                              </Badge>
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {listing.bookingsCount || 0} bookings
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto sm:flex-shrink-0">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="glass-effect"
                              onClick={() => navigate(`/item/${listing.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="glass-effect"
                              onClick={() => navigate('/profile')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">No listings yet</p>
                      <Link to="/post">
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Listing
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Booking Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ownerBookings.length > 0 ? (
                    ownerBookings.map((booking) => {
                      const startDate = booking.startDate?.toDate ? booking.startDate.toDate() : new Date(booking.startDate || 0);
                      const endDate = booking.endDate?.toDate ? booking.endDate.toDate() : new Date(booking.endDate || 0);
                      return (
                        <div key={booking.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 glass-effect rounded-lg">
                          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-sm sm:text-base">{booking.listingTitle || 'Unknown Item'}</h3>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                Booking ID: {booking.id.slice(0, 8)}...
                              </p>
                              <div className="flex items-center text-[10px] sm:text-xs text-muted-foreground mt-1">
                                <Calendar className="h-3 w-3 mr-1" />
                                {format(startDate, 'MMM dd')} - {format(endDate, 'MMM dd, yyyy')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                            <div className="text-right">
                              <p className="font-semibold text-sm sm:text-base">₹{(booking.totalRent || booking.amount || 0).toLocaleString()}</p>
                              <Badge className={`text-[10px] sm:text-xs ${getStatusColor(booking.status)} text-white`}>
                                {booking.status}
                              </Badge>
                            </div>
                            {booking.status === "pending" && (
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-8 sm:h-9 text-xs sm:text-sm"
                                  onClick={() => navigate('/owner-bookings')}
                                >
                                  Manage
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">No bookings yet</p>
                      <Link to="/explore">
                        <Button variant="outline">Browse Listings</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      {user?.profilePhotoUrl ? (
                        <img src={user.profilePhotoUrl} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-lg">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{user?.name || 'User'}</h3>
                      <p className="text-sm text-muted-foreground">{user?.email || ''}</p>
                      <div className="flex items-center mt-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                        <span className="text-sm">
                          {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '0.0'} ({reviews.length} reviews)
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {user?.phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">{user.phone}</span>
                      </div>
                    )}
                    {user?.createdAt && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">
                          Member since {format(user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt), 'MMMM yyyy')}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full glass-effect"
                    onClick={() => navigate('/profile')}
                  >
                    Edit Profile
                  </Button>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start glass-effect">
                    <Settings className="h-4 w-4 mr-2" />
                    Account Settings
                  </Button>
                  <Button variant="outline" className="w-full justify-start glass-effect">
                    <Bell className="h-4 w-4 mr-2" />
                    Notification Preferences
                  </Button>
                  <Button variant="outline" className="w-full justify-start glass-effect">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Payment Methods
                  </Button>
                  <Button variant="outline" className="w-full justify-start glass-effect">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Analytics & Insights
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;