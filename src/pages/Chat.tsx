import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  sendTransactionMessage, 
  subscribeToTransactionMessages, 
  getTransaction, 
  getListing, 
  getUser,
  Message,
  Transaction,
  Listing,
  User
} from "@/lib/firestore";
import { auth } from "@/lib/firebase";
import { 
  ArrowLeft, 
  Send, 
  Package, 
  User as UserIcon,
  Calendar,
  DollarSign,
  MapPin
} from "lucide-react";

const Chat = () => {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);

  useEffect(() => {
    if (!transactionId || !auth.currentUser) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch transaction data
        const transactionData = await getTransaction(transactionId);
        if (!transactionData) {
          navigate('/transactions');
          return;
        }
        
        setTransaction(transactionData);

        // Fetch listing and other user data
        const [listingData, otherUserData] = await Promise.all([
          getListing(transactionData.itemId),
          getUser(transactionData.ownerId === auth.currentUser.uid 
            ? transactionData.renterId 
            : transactionData.ownerId)
        ]);

        setListing(listingData);
        setOtherUser(otherUserData);

        // Subscribe to messages
        const unsubscribe = subscribeToTransactionMessages(transactionId, (newMessages) => {
          setMessages(newMessages);
          scrollToBottom();
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error fetching chat data:', error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = fetchData();
    return () => {
      if (unsubscribe) {
        unsubscribe.then(unsub => unsub && unsub());
      }
    };
  }, [transactionId, navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !auth.currentUser || !transactionId) return;

    setSending(true);
    try {
      await sendTransactionMessage(transactionId, {
        senderId: auth.currentUser.uid,
        text: newMessage.trim()
      });
      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="app-shell">
        <Header />
        <div className="container py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading chat...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!transaction || !listing || !otherUser) {
    return (
      <div className="app-shell">
        <Header />
        <div className="container py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Chat not found</h1>
            <Button onClick={() => navigate('/transactions')}>
              Back to Transactions
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell flex flex-col overflow-hidden sm:overflow-visible">
      <Header />
      
      <div className="container py-3 sm:py-6 md:py-8 flex-1 flex flex-col min-h-0 sm:block sm:flex-none">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6 px-2 sm:px-0">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/transactions')}
            className="h-8 w-8 sm:h-10 sm:w-10"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl md:text-2xl font-urbanist font-bold truncate">
              Chat with <span className="gradient-text">{otherUser.name}</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Transaction: {listing.title}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-6 flex-1 min-h-0 lg:h-[calc(100dvh-8rem)] px-2 sm:px-0">
          {/* Transaction Info Sidebar */}
          <div className="lg:col-span-1 order-2 lg:order-1 min-h-0 hidden lg:block">
            <Card className="glass-card h-auto lg:h-full border-border bg-card">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="flex items-center text-base sm:text-lg">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
                  Transaction Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <img 
                    src={listing.images[0] || "/placeholder.svg"} 
                    alt={listing.title}
                    className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-xs sm:text-sm truncate">{listing.title}</h3>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs mt-1">
                      {listing.category}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">Owner: {otherUser.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs">
                      {transaction.startDate?.toDate().toLocaleDateString()} - {transaction.endDate?.toDate().toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">₹{transaction.amount} ({transaction.paymentMode})</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs truncate">
                      {listing.location ? 
                        `${listing.location.latitude.toFixed(2)}, ${listing.location.longitude.toFixed(2)}` : 
                        'Location not set'
                      }
                    </span>
                  </div>
                </div>

                <Badge className={`w-full justify-center text-xs sm:text-sm ${transaction.status === 'active' ? 'bg-green-500' : transaction.status === 'pending' ? 'bg-yellow-500' : 'bg-blue-500'}`}>
                  {transaction.status.toUpperCase()}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3 order-1 lg:order-2 flex flex-col min-h-0 flex-1">
            <Card className="glass-card flex flex-col flex-1 min-h-0 border-border bg-card h-[calc(100dvh-10.5rem)] sm:h-[calc(100dvh-12rem)] lg:h-full max-h-[calc(100dvh-10.5rem)] lg:max-h-none">
              <CardHeader className="border-b p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Avatar className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
                    {otherUser.profilePhotoUrl ? (
                      <img 
                        src={otherUser.profilePhotoUrl} 
                        alt={otherUser.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <AvatarFallback className="bg-primary text-white text-xs sm:text-sm">
                        {otherUser.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm sm:text-base truncate">{otherUser.name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {otherUser.verified ? 'Verified User' : 'Unverified User'}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                {/* Messages */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3 sm:space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-6 sm:py-8 px-4">
                      <p className="text-sm sm:text-base">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwn = message.senderId === auth.currentUser?.uid;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 rounded-lg ${
                              isOwn
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            <p className="text-xs sm:text-sm break-words">{message.text}</p>
                            <p className={`text-[10px] sm:text-xs mt-1 ${
                              isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              {formatTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t p-3 sm:p-4 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <form onSubmit={handleSendMessage} className="flex gap-2 min-w-0">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 min-w-0 h-9 sm:h-10 text-base sm:text-sm"
                      disabled={sending}
                    />
                    <Button 
                      type="submit" 
                      disabled={!newMessage.trim() || sending}
                      size="icon"
                      className="h-9 w-9 sm:h-10 sm:w-10"
                    >
                      <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
