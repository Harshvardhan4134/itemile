import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  ChevronRight
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { 
  subscribeToChats, 
  sendChatMessage, 
  subscribeToChatMessages,
  getChatsByUser,
  getUser,
  getListings,
  Chat,
  Message,
  User as UserType,
  Listing
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

      // Load shared listings (mock data for now)
      const allListings = await getListings();
      setSharedListings(allListings.slice(0, 12));

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
    setCurrentChat(chat);
    // Don't navigate, just load the chat data inline
    await loadChatData(chat);
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
    <div className="h-screen flex bg-gray-50 flex-col sm:flex-row">
      {/* Chat List Panel */}
      <div className={`${chatId ? 'hidden sm:flex' : 'flex'} w-full sm:w-80 bg-gray-100 flex-col border-r border-gray-200`}>
        <div className="p-3 sm:p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-bold">Chats</h2>
            <Button variant="ghost" size="icon" className="text-primary h-8 w-8 sm:h-10 sm:w-10">
              <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
            <Input
              placeholder="Search in messages"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 sm:pl-10 bg-gray-50 border-gray-200 h-9 sm:h-10 text-sm sm:text-base"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
                {filteredChats.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
              <p className="text-gray-500 text-sm">
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
                    className={`p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-200 ${
                      isActive ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                          }`}
                          onClick={() => handleChatSelect(chat)}
                        >
                          <div className="flex items-center gap-2 sm:gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                          <AvatarImage src={otherUserData?.profilePhotoUrl} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                                  {otherUserData?.name?.charAt(0).toUpperCase() || otherUserId?.charAt(0).toUpperCase() || 'U'}
                                </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-primary rounded-full border-2 border-white"></div>
                              )}
                      </div>
                            <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-xs sm:text-sm truncate">
                                  {otherUserData?.name || `User ${otherUserId?.slice(0, 6)}`}
                                </p>
                          <span className="text-[10px] sm:text-xs text-gray-500 ml-1">
                                  {formatTime(chat.lastUpdated)}
                                </span>
                              </div>
                        <p className="text-[10px] sm:text-xs text-gray-500 truncate">
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
      <div className={`${!chatId ? 'hidden sm:flex' : 'flex'} flex-1 flex-col bg-gray-100 relative`}>
            {currentChat && otherUser ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-3 sm:p-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="sm:hidden h-8 w-8"
                      onClick={() => navigate('/chat')}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                <Avatar className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
                  <AvatarImage src={otherUser.profilePhotoUrl} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                    {otherUser.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{otherUser.name}</h3>
                  <p className="text-xs sm:text-sm text-green-600">Online now</p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10 h-8 w-8 sm:h-9 sm:w-9">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                {/* Removed call buttons as requested */}
              </div>
                  </div>

            {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                    {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8 px-4">
                        <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                        <p className="text-sm sm:text-base">No messages yet. Start the conversation!</p>
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
                          <div className="text-center text-[10px] sm:text-xs text-gray-500 my-3 sm:my-4">
                            {formatMessageTime(message.createdAt)}
                          </div>
                        )}
                        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[85%] sm:max-w-md px-3 sm:px-4 py-2 rounded-2xl ${
                              isOwn
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-white text-gray-800 border border-gray-200'
                            }`}
                          >
                            {imageUrl && (
                              <div className="mb-2 rounded-lg overflow-hidden">
                                <img
                                  src={imageUrl}
                                  alt="Shared image"
                                  className="w-full max-h-48 sm:max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
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
                              <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{textWithoutImage}</p>
                            )}
                            <p className={`text-[10px] sm:text-xs mt-1 ${
                              isOwn ? 'text-primary-foreground/70' : 'text-gray-500'
                            }`}>
                              {message.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
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
            <div className="bg-white border-t border-gray-200 p-2 sm:p-4">
              <form onSubmit={handleSendMessage} className="flex items-center gap-1 sm:gap-2">
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
                  className="text-gray-500 h-8 w-8 sm:h-9 sm:w-9"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-gray-500 h-8 w-8 sm:h-9 sm:w-9 hidden sm:flex"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading}
                >
                  <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="text-gray-500 h-8 w-8 sm:h-9 sm:w-9 hidden sm:flex" disabled>
                  <List className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <span
                  className="text-[10px] sm:text-xs text-gray-500 cursor-pointer select-none hidden sm:inline"
                  onClick={() => imageInputRef.current?.click()}
                >
                  GIF
                </span>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={uploading ? "Uploading..." : "Type a message..."}
                  className="flex-1 border-gray-200 h-9 sm:h-10 text-sm sm:text-base"
                  disabled={sending || uploading}
                />
                <Button type="button" variant="ghost" size="icon" className="text-gray-500 h-8 w-8 sm:h-9 sm:w-9 hidden sm:flex">
                  <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim() || sending || uploading}
                  size="icon"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 w-8 sm:h-9 sm:w-9"
                >
                  <Send className="h-4 w-4 sm:h-5 sm:w-5" />
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
      {currentChat && showDetails && (
        <div className="hidden lg:flex w-80 bg-gray-100 border-l border-gray-200 flex-col">
          <div className="p-3 sm:p-4 border-b border-gray-200 bg-white flex items-center justify-between">
            <h3 className="font-semibold text-sm sm:text-base">Chat details</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDetails(false)}
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
            {/* Quick Access Icons */}
            <div className="flex gap-4 justify-center">
              <Button variant="ghost" size="icon" className="text-gray-600">
                <ImageIcon className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-600">
                <FileText className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-600">
                <LinkIcon className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-600">
                <Pin className="h-5 w-5" />
              </Button>
            </div>

            {/* Featured Rentals */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">Featured Rentals ({sharedListings.length})</h4>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {sharedListings.slice(0, 6).map((listing) => (
                  <div
                    key={listing.id}
                    className="aspect-square rounded-lg overflow-hidden bg-gray-200 cursor-pointer hover:opacity-80 group"
                    onClick={() => window.open(`/item/${listing.id}`, '_blank')}
                  >
                    {listing.images && listing.images.length > 0 ? (
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.svg';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Available Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">Available Items (8)</h4>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
              <div className="space-y-2">
                {sharedListings.slice(0, 4).map((listing) => (
                  <div
                    key={listing.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/item/${listing.id}`)}
                  >
                    <FileText className="h-4 w-4 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{listing.title}</p>
                      <p className="text-xs text-gray-500">{(Math.random() * 1000).toFixed(0)} kB</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shared Listings */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">Shared Listings (5)</h4>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
              <div className="space-y-2">
                {sharedListings.slice(0, 3).map((listing) => (
                  <div
                    key={listing.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/item/${listing.id}`)}
                  >
                    <LinkIcon className="h-4 w-4 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{listing.title}</p>
                      <p className="text-xs text-gray-500 truncate">
                        https://lendlly.vercel.app/item/{listing.id}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
  );
};

export default ChatInbox;
