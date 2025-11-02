import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getAllRequests, getRequest, markRequestAsMatched, getUser, createChat, sendMessage, getChatByRequestId } from "@/lib/firestore";
import { Request, User } from "@/lib/firestore";
import { auth } from "@/lib/firebase";
import { 
  MapPin, 
  Search, 
  Filter, 
  Clock,
  DollarSign,
  Tag,
  User as UserIcon,
  MessageCircle,
  Plus
} from "lucide-react";

const RequestsFeed = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [users, setUsers] = useState<{ [key: string]: User }>({});
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { toast } = useToast();

  const categories = [
    "Photography", "Sports & Outdoor", "Electronics", "Tools", 
    "Gaming", "Music", "Kitchen", "Furniture", "Books", "Clothing"
  ];

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const data = await getAllRequests();
        setRequests(data);
        
        // Fetch user data for each request
        const userPromises = data.map(request => getUser(request.userId));
        const userData = await Promise.all(userPromises);
        
        const usersMap: { [key: string]: User } = {};
        userData.forEach((user, index) => {
          if (user) {
            usersMap[data[index].userId] = user;
          }
        });
        setUsers(usersMap);
      } catch (error) {
        console.error('Error fetching requests:', error);
        toast({
          title: "Error",
          description: "Failed to load requests",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [toast]);

  // Get user location on mount
  useEffect(() => {
    const getCurrentLocation = () => {
      if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by this browser.');
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(coords);
        },
        (err) => {
          // Only log error details if it's not a permission denied (common case)
          if (err.code !== err.PERMISSION_DENIED) {
            console.warn('Error getting current position:', err.message || err);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    };

    getCurrentLocation();
  }, []);

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
  };

  // Format distance for display
  const formatDistance = (request: Request): string => {
    if (!userLocation || !request.location) {
      return 'Location unknown';
    }
    
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      request.location.latitude,
      request.location.longitude
    );
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m away`;
    } else {
      return `${distance.toFixed(1)}km away`;
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryFilter || categoryFilter === "all" || request.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const handleIHaveThisItem = async (request: Request) => {
    if (!auth.currentUser) {
      toast({
        title: "Authentication required",
        description: "Please log in to respond to requests",
        variant: "destructive"
      });
      return;
    }

    if (auth.currentUser.uid === request.userId) {
      toast({
        title: "Cannot respond to your own request",
        description: "You cannot respond to your own request",
        variant: "destructive"
      });
      return;
    }

    try {
      // Mark the request as matched
      await markRequestAsMatched(request.id, auth.currentUser.uid);

      // Create a chat between the requester and responder
      const chatId = `chat_${request.userId}_${auth.currentUser.uid}_${Date.now()}`;
      await createChat(chatId, request.userId, auth.currentUser.uid, `Request: ${request.itemName}`, undefined, request.id);

      // Send an initial message
      const initialMessage = `Hi! I have ${request.itemName} that you're looking for. Let's discuss the details!`;
      await sendMessage(chatId, auth.currentUser.uid, initialMessage);

      // Update the local state
      setRequests(prev => prev.map(r => 
        r.id === request.id 
          ? { ...r, matched: true, matchedWith: auth.currentUser!.uid, matchedAt: new Date() }
          : r
      ));

      toast({
        title: "Response sent!",
        description: "Taking you to the chat to start the conversation...",
      });

      // Navigate directly to the created chat after ensuring it's created
      setTimeout(() => {
        navigate(`/chat/${chatId}`);
      }, 1000);

    } catch (error) {
      console.error('Error responding to request:', error);
      toast({
        title: "Error",
        description: "Failed to respond to request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getUserName = (userId: string) => {
    const user = users[userId];
    return user ? user.name : "Unknown User";
  };

  const getUserRating = (userId: string) => {
    const user = users[userId];
    return user ? user.rating : 0;
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
      console.log('Looking for chat with requestId:', requestId, 'userId:', auth.currentUser.uid);
      
      // Show loading state
      toast({
        title: "Loading conversation...",
        description: "Finding your chat...",
      });

      const chat = await getChatByRequestId(requestId, auth.currentUser.uid);
      console.log('Found chat:', chat);
      
      if (chat) {
        console.log('Navigating to chat:', `/chat/${chat.id}`);
        toast({
          title: "Opening conversation",
          description: "Taking you to the chat...",
        });
        navigate(`/chat/${chat.id}`);
      } else {
        console.log('Chat not found, falling back to inbox');
        toast({
          title: "Chat not found",
          description: "Could not find the conversation. Please check your messages in the chat inbox.",
          variant: "destructive"
        });
        // Give user a moment to read the message, then navigate
        setTimeout(() => {
          navigate('/chat');
        }, 1500);
      }
    } catch (error) {
      console.error('Error finding chat:', error);
      toast({
        title: "Error",
        description: "Failed to open chat. Redirecting to chat inbox.",
        variant: "destructive"
      });
      setTimeout(() => {
        navigate('/chat');
      }, 1500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading requests...</p>
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-urbanist font-bold mb-2">
                <span className="gradient-text">Requests</span> Feed
              </h1>
              <p className="text-xl text-muted-foreground">
                All requests from people nearby - respond to unmatched ones or track your own
              </p>
            </div>
            
            <Link to="/post-request">
              <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity">
                <Plus className="h-4 w-4 mr-2" />
                Post Request
              </Button>
            </Link>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 glass-effect border-0"
                />
              </div>
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48 glass-effect border-0">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Requests Grid */}
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">
                  {searchTerm || categoryFilter ? "No requests found" : "No requests yet"}
                </h3>
                <p className="text-sm">
                  {searchTerm || categoryFilter 
                    ? "Try adjusting your search or filter criteria"
                    : "Be the first to post a request for an item you need!"
                  }
                </p>
              </div>
              {!searchTerm && !categoryFilter && (
                <Link to="/post-request">
                  <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity">
                    Post Your First Request
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="glass-card hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold mb-2">
                          {request.itemName}
                        </CardTitle>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="secondary" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {request.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    {/* User Info */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UserIcon className="h-4 w-4" />
                      <span>{getUserName(request.userId)}</span>
                      {getUserRating(request.userId) > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <span className="text-yellow-500">★</span>
                            {getUserRating(request.userId).toFixed(1)}
                          </span>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {request.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {request.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{request.duration} day{request.duration !== 1 ? 's' : ''}</span>
                      </div>
                      
                      {request.maxBudget && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>Up to ₹{request.maxBudget}/day</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{formatDistance(request)}</span>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      {request.matched ? (
                        <div className="space-y-2">
                          {auth.currentUser?.uid === request.userId ? (
                            <div className="text-center">
                              <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700 mb-2">
                                ✓ Matched - Someone responded!
                              </Badge>
                              <Button 
                                onClick={() => handleViewChat(request.id)}
                                variant="outline" 
                                size="sm" 
                                className="w-full"
                              >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                View Conversation
                              </Button>
                            </div>
                          ) : auth.currentUser?.uid === request.matchedWith ? (
                            <div className="text-center">
                              <Badge variant="default" className="text-xs bg-blue-600 hover:bg-blue-700 mb-2">
                                ✓ You responded to this request
                              </Badge>
                              <Button 
                                onClick={() => handleViewChat(request.id)}
                                variant="outline" 
                                size="sm" 
                                className="w-full"
                              >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Continue Chat
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-xs w-full">
                              Request Matched
                            </Badge>
                          )}
                        </div>
                      ) : auth.currentUser?.uid !== request.userId ? (
                        <Button 
                          onClick={() => handleIHaveThisItem(request)}
                          className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                          size="sm"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          I Have This Item
                        </Button>
                      ) : (
                        <div className="text-center py-2">
                          <Badge variant="secondary" className="text-xs">
                            Your Request - Waiting for responses
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestsFeed;
