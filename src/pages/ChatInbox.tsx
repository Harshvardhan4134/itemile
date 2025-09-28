import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Send, 
  Search,
  MessageCircle,
  User,
  Package,
  Clock
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { 
  subscribeToChats, 
  getChat, 
  sendChatMessage, 
  subscribeToChatMessages,
  getUser,
  Chat,
  Message,
  User as UserType
} from "@/lib/firestore";

const ChatInbox = () => {
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId?: string }>();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<UserType | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatUsers, setChatUsers] = useState<Map<string, UserType>>(new Map());

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    const unsubscribe = subscribeToChats(auth.currentUser!.uid, async (userChats) => {
      setChats(userChats);
      setLoading(false);

      // Load user data for all chats
      const userMap = new Map<string, UserType>();
      for (const chat of userChats) {
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

      // If a specific chat is selected, load it
      if (chatId) {
        const chat = userChats.find(c => c.id === chatId);
        if (chat) {
          setCurrentChat(chat);
          loadChatData(chat);
        }
      }
    });

    return () => unsubscribe();
  }, [navigate, chatId]);

  const loadChatData = async (chat: Chat) => {
    try {
      // Get the other participant
      const otherUserId = chat.participants.find(id => id !== auth.currentUser?.uid);
      if (otherUserId) {
        const otherUserData = await getUser(otherUserId);
        setOtherUser(otherUserData);
      }

      // Subscribe to messages
      const unsubscribe = subscribeToChatMessages(chat.id, (newMessages) => {
        setMessages(newMessages);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading chat data:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !auth.currentUser || !currentChat) return;

    setSending(true);
    try {
      await sendChatMessage(currentChat.id, auth.currentUser.uid, newMessage.trim());
      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleChatSelect = async (chat: Chat) => {
    setCurrentChat(chat);
    navigate(`/chat/${chat.id}`);
    await loadChatData(chat);
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    const otherUserId = chat.participants.find(id => id !== auth.currentUser?.uid);
    return chat.listingTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           otherUserId?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading chats...</p>
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
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/explore')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-urbanist font-bold">
              <span className="gradient-text">Messages</span>
            </h1>
            <p className="text-muted-foreground">Chat with other users about rentals</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
          {/* Chat List */}
          <div className="lg:col-span-1">
            <Card className="glass-card h-full flex flex-col">
              <CardHeader className="border-b">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-0 bg-transparent p-0 focus-visible:ring-0"
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-0">
                {filteredChats.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
                    <p className="text-muted-foreground text-sm">
                      Start chatting by contacting item owners
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredChats.map((chat) => {
                      const otherUserId = chat.participants.find(id => id !== auth.currentUser?.uid);
                      const otherUserData = otherUserId ? chatUsers.get(otherUserId) : null;
                      const isActive = chat.id === chatId;
                      
                      return (
                        <div
                          key={chat.id}
                          className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b ${
                            isActive ? 'bg-primary/10 border-primary/20' : ''
                          }`}
                          onClick={() => handleChatSelect(chat)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              {otherUserData?.profilePhotoUrl ? (
                                <img 
                                  src={otherUserData.profilePhotoUrl} 
                                  alt={otherUserData.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                                  {otherUserData?.name?.charAt(0).toUpperCase() || otherUserId?.charAt(0).toUpperCase() || 'U'}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm truncate">
                                  {otherUserData?.name || `User ${otherUserId?.slice(0, 6)}`}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(chat.lastUpdated)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {chat.listingTitle ? `About: ${chat.listingTitle}` : (chat.lastMessage || 'No messages yet')}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            {currentChat && otherUser ? (
              <Card className="glass-card h-full flex flex-col">
                <CardHeader className="border-b">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {otherUser.profilePhotoUrl ? (
                        <img 
                          src={otherUser.profilePhotoUrl} 
                          alt={otherUser.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                          {otherUser.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{otherUser.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Chat Conversation
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col p-0">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No messages yet. Start the conversation!</p>
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
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                isOwn
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-foreground'
                              }`}
                            >
                              <p className="text-sm">{message.text}</p>
                              <p className={`text-xs mt-1 ${
                                isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}>
                                {formatTime(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="border-t p-4">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1"
                        disabled={sending}
                      />
                      <Button 
                        type="submit" 
                        disabled={!newMessage.trim() || sending}
                        size="icon"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-card h-full flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                  <p className="text-muted-foreground">
                    Choose a chat from the sidebar to start messaging
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInbox;
