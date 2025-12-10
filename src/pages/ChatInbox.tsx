import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Send, 
  Search,
  MessageCircle,
  Home,
  Plus,
  AlertTriangle,
  Package,
  Phone,
  Video,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Pin,
  MoreVertical,
  Smile,
  Paperclip,
  List,
  X,
  ChevronRight,
  Info,
  CheckCircle2
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { 
  subscribeToChats, 
  sendChatMessage, 
  subscribeToChatMessages,
  getChatsByUser,
  getUser,
  getListings,
  getTransaction,
  Chat,
  Message,
  User as UserType,
  Listing,
  Transaction
} from "@/lib/firestore";
import { Unsubscribe } from "firebase/firestore";
import { uploadToCloudinary } from "@/lib/cloudinary";

const ChatInbox = () => {
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId?: string }>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<UserType | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatUsers, setChatUsers] = useState<Map<string, UserType>>(new Map());
  const [showDetails, setShowDetails] = useState(true);
  const [sharedListings, setSharedListings] = useState<Listing[]>([]);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  // Track merged subscriptions when loading history across multiple chats
  const messageUnsubscribersRef = useRef<Unsubscribe[]>([]);
  // We may have multiple chat threads with the same user; use the most recent for sending
  const [activeChatIdForSend, setActiveChatIdForSend] = useState<string | null>(null);
  // Refs for hidden inputs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handlePickAndUpload = async (file: File | null) => {
    if (!file) return;
    try {
      setUploading(true);
      const result = await uploadToCloudinary(file, "chat");
      const url = result.secure_url;
      setNewMessage((prev) => (prev ? `${prev} ${url}` : url));
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const onImageInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    await handlePickAndUpload(file || null);
    // Reset so the same file can be picked again
    if (e.target) e.target.value = "";
  };

  const onFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    await handlePickAndUpload(file || null);
    if (e.target) e.target.value = "";
  };

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    const unsubscribe = subscribeToChats(auth.currentUser!.uid, async (userChats) => {
      // Deduplicate chats by the other participant to avoid repeated names.
      const dedupedByUser = Array.from(
        userChats.reduce((map, chat) => {
          const otherUserId = chat.participants.find(id => id !== auth.currentUser?.uid);
          if (!otherUserId) return map;
          const existing = map.get(otherUserId);
          const chatTime = chat.lastUpdated?.toDate?.().getTime?.() ?? 0;
          const existingTime = existing?.lastUpdated?.toDate?.().getTime?.() ?? 0;
          if (!existing || chatTime > existingTime) {
            map.set(otherUserId, chat);
          }
          return map;
        }, new Map<string, Chat>())
        .values()
      );

      setChats(dedupedByUser);
      setLoading(false);

      // Load user data for all chats
      const userMap = new Map<string, UserType>();
      for (const chat of dedupedByUser) {
        const otherUserId = chat.participants.find(id => id !== auth.currentUser?.uid);
        if (otherUserId && !userMap.has(otherUserId)) {
          try {
            const userData = await getUser(otherUserId);
            if (userData) {
              userMap.set(otherUserId, userData);
            }
          } catch (error) {
            console.error('Error loading user data:', error);
          }
        }
      }
      setChatUsers(userMap);

      // If a specific chat is selected from URL, load it
      if (chatId) {
        const chat = dedupedByUser.find(c => c.id === chatId);
        if (chat) {
          setCurrentChat(chat);
          loadChatData(chat);
        }
      } else if (dedupedByUser.length > 0 && !currentChat) {
        // Auto-select first chat if none selected
        setCurrentChat(dedupedByUser[0]);
        loadChatData(dedupedByUser[0]);
      }
    });

    return () => unsubscribe();
  }, [navigate, chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clears any existing message subscriptions
  const clearMessageSubscriptions = () => {
    if (messageUnsubscribersRef.current.length > 0) {
      messageUnsubscribersRef.current.forEach(unsub => {
        try { unsub(); } catch {}
      });
      messageUnsubscribersRef.current = [];
    }
  };

  const loadChatData = async (chat: Chat) => {
    try {
      // Get the other participant
      const otherUserId = chat.participants.find(id => id !== auth.currentUser?.uid);
      if (!otherUserId) return;

      const otherUserData = await getUser(otherUserId);
      setOtherUser(otherUserData);

      // We want complete history across all chats with this user.
      // 1) Clear previous subscriptions
      clearMessageSubscriptions();

      // 2) Load all chats between current user and this other user
      const allMyChats = await getChatsByUser(auth.currentUser!.uid);
      const chatsWithUser = allMyChats.filter(c => c.participants.includes(otherUserId));

      // Choose the most recent chat for sending
      const mostRecentChat = chatsWithUser
        .slice()
        .sort((a, b) => {
          const aTime = a.lastUpdated?.toDate?.().getTime?.() ?? 0;
          const bTime = b.lastUpdated?.toDate?.().getTime?.() ?? 0;
          return bTime - aTime;
        })[0];
      setActiveChatIdForSend(mostRecentChat?.id ?? chat.id);

      // 3) Subscribe to messages for each chat and merge by timestamp
      const chatIdToMessages = new Map<string, Message[]>();

      const recomputeMerged = () => {
        const merged = Array.from(chatIdToMessages.values()).flat();
        merged.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.().getTime?.() ?? 0;
          const bTime = b.createdAt?.toDate?.().getTime?.() ?? 0;
          return aTime - bTime;
        });
        setMessages(merged);
      };

      chatsWithUser.forEach((c) => {
        const unsub = subscribeToChatMessages(c.id, (newMessages) => {
          chatIdToMessages.set(c.id, newMessages);
          recomputeMerged();
        });
        messageUnsubscribersRef.current.push(unsub);
      });

      // Load shared listings
      const allListings = await getListings();
      setSharedListings(allListings.slice(0, 12));

      // Load transaction if chat has one
      if (chat.transactionId) {
        try {
          const transactionData = await getTransaction(chat.transactionId);
          setCurrentTransaction(transactionData);
        } catch (error) {
          console.error('Error loading transaction:', error);
        }
      } else {
        setCurrentTransaction(null);
      }

      // Note: unsubscribe handled via clearMessageSubscriptions on next load/unmount
    } catch (error) {
      console.error('Error loading chat data:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !auth.currentUser) return;

    setSending(true);
    try {
      const destinationChatId = activeChatIdForSend || currentChat?.id;
      if (!destinationChatId) return;
      await sendChatMessage(destinationChatId, auth.currentUser.uid, newMessage.trim());
      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleChatSelect = async (chat: Chat) => {
    // Keep URL in sync for deep linking
    if (chat.id === chatId) {
      return;
    }
    navigate(`/chat/${chat.id}`);
  };

  const handleBackToChatList = () => {
    setCurrentChat(null);
    setOtherUser(null);
    setMessages([]);
    setActiveChatIdForSend(null);
    clearMessageSubscriptions();
    navigate('/chat');
  };

  // Clear subscriptions on unmount
  useEffect(() => {
    return () => {
      clearMessageSubscriptions();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)} m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} h`;
    return `${Math.floor(diffInMinutes / 1440)} d`;
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    const otherUserId = chat.participants.find(id => id !== auth.currentUser?.uid);
    const otherUserData = otherUserId ? chatUsers.get(otherUserId) : null;
    return chat.listingTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           otherUserData?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-2"></div>
          <p className="text-gray-500">Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden relative">
        {/* Chat List Panel */}
        <div className={`${currentChat && chatId ? 'hidden sm:flex' : 'flex'} w-full sm:w-80 bg-white flex-col border-r border-border`}>
          <div className="p-4 border-b border-border bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Messages</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted border-border h-10"
              />
            </div>
          </div>

        <div className="flex-1 overflow-y-auto">
                {filteredChats.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
              <p className="text-muted-foreground text-sm">
                      Start chatting by contacting item owners
                    </p>
                  </div>
                ) : (
            <div>
                    {filteredChats.map((chat) => {
                      const otherUserId = chat.participants.find(id => id !== auth.currentUser?.uid);
                      const otherUserData = otherUserId ? chatUsers.get(otherUserId) : null;
                      const isActive = chat.id === chatId;
                const isOnline = Math.random() > 0.5; // Mock online status
                      
                      return (
                        <div
                          key={chat.id}
                    className={`p-4 cursor-pointer transition-colors border-b border-border ${
                      isActive ? 'bg-primary/10' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => handleChatSelect(chat)}
                        >
                          <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={otherUserData?.profilePhotoUrl} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                                  {otherUserData?.name?.charAt(0).toUpperCase() || otherUserId?.charAt(0).toUpperCase() || 'U'}
                                </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                              )}
                      </div>
                            <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-sm truncate">
                                  {otherUserData?.name || `User ${otherUserId?.slice(0, 6)}`}
                                </p>
                          <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                                  {formatTime(chat.lastUpdated)}
                                </span>
                              </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {chat.lastMessage || 'No messages yet'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
        </div>
          </div>

      {/* Chat Conversation Panel */}
      <div className={`${!currentChat ? 'hidden sm:flex' : 'flex'} flex-1 flex-col bg-white relative`}>
            {currentChat && otherUser ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-border p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={otherUser.profilePhotoUrl} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {otherUser.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-base truncate">{otherUser.name}</h3>
                  <p className="text-sm text-green-600">Online now</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Video className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Phone className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Info className="h-5 w-5" />
                </Button>
              </div>
                  </div>

            {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
                    {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 px-4">
                        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                <>
                  {messages.map((message, index) => {
                        const isOwn = message.senderId === auth.currentUser?.uid;
                    const prevMessage = index > 0 ? messages[index - 1] : null;
                    const showTimestamp = !prevMessage || 
                      (message.createdAt?.toDate().getTime() - prevMessage.createdAt?.toDate().getTime()) > 300000; // 5 minutes
                    
                    // Check if message contains image URLs
                    const imageUrl = message.text?.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i)?.[0];
                    const textWithoutImage = imageUrl ? message.text.replace(imageUrl, '').trim() : message.text;
                        
                        return (
                      <div key={message.id}>
                        {showTimestamp && (
                          <div className="text-center text-xs text-muted-foreground my-4">
                            {formatMessageTime(message.createdAt)}
                          </div>
                        )}
                        <div className={`flex ${isOwn ? 'justify-start' : 'justify-end'}`}>
                          <div
                            className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                              isOwn
                                ? 'bg-muted text-foreground border border-border'
                                : 'bg-primary text-primary-foreground'
                            }`}
                          >
                            {imageUrl && (
                              <div className="mb-2 rounded-lg overflow-hidden">
                                <img
                                  src={imageUrl}
                                  alt="Shared image"
                                  className="w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(imageUrl, '_blank')}
                                  loading="lazy"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            {textWithoutImage && (
                              <p className="text-sm whitespace-pre-wrap break-words">{textWithoutImage}</p>
                            )}
                            <div className={`flex items-center gap-1 mt-1 ${
                              isOwn ? 'justify-start' : 'justify-end'
                            }`}>
                              {!isOwn && (
                                <div className="flex items-center">
                                  <CheckCircle2 className="h-3 w-3 text-primary-foreground/70" />
                                  <CheckCircle2 className="h-3 w-3 text-primary-foreground/70 -ml-1" />
                                </div>
                              )}
                              <p className={`text-xs ${
                                isOwn ? 'text-muted-foreground' : 'text-primary-foreground/70'
                              }`}>
                                {message.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                            </div>
                          </div>
                        );
                  })}
                  <div ref={messagesEndRef} />
                </>
                    )}
                  </div>

                  {/* Message Input */}
            <div className="bg-white border-t border-border p-4">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={onFileInputChange}
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*,.gif"
                  className="hidden"
                  onChange={onImageInputChange}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading}
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={uploading ? "Uploading..." : "Type your message..."}
                  className="flex-1 border-border h-10"
                  disabled={sending || uploading}
                />
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim() || sending || uploading}
                  size="icon"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 w-9"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </>
            ) : (
          <div className="flex-1 flex items-center justify-center px-4">
                <div className="text-center">
              <MessageCircle className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2">Select a conversation</h3>
              <p className="text-sm sm:text-base text-gray-500">
                    Choose a chat from the sidebar to start messaging
                  </p>
                </div>
          </div>
        )}
      </div>
        {/* Chat Details Panel */}
        {currentChat && showDetails && otherUser && (
        <div className="hidden lg:flex w-80 bg-white border-l border-border flex-col">
          <div className="p-4 border-b border-border bg-white flex items-center justify-between">
            <h3 className="font-semibold text-base">Details</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDetails(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* User Profile */}
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 mb-3">
                <AvatarImage src={otherUser.profilePhotoUrl} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {otherUser.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h4 className="font-semibold text-lg mb-1">{otherUser.name}</h4>
              {otherUser.verificationStatus === 'verified' && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Verified Member</span>
                </div>
              )}
            </div>

            {/* Shared Media */}
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground uppercase mb-3">Shared Media</h4>
              <div className="grid grid-cols-3 gap-2">
                {sharedListings.slice(0, 3).map((listing) => (
                  <div
                    key={listing.id}
                    className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80"
                    onClick={() => navigate(`/item/${listing.id}`)}
                  >
                    {listing.images && listing.images.length > 0 ? (
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.svg';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Current Rental */}
            {currentTransaction && currentChat.listingTitle && (
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground uppercase mb-3">Current Rental</h4>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer"
                  onClick={() => currentTransaction && navigate(`/transactions/${currentTransaction.id}`)}
                >
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{currentChat.listingTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      ₹{currentTransaction.totalRent || currentTransaction.amount || 0} / day
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
        {/* Show Details Button when hidden */}
        {currentChat && !showDetails && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex absolute right-4 top-1/2 transform -translate-y-1/2 bg-white shadow-lg h-8 w-8 sm:h-9 sm:w-9"
            onClick={() => setShowDetails(true)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ChatInbox;
