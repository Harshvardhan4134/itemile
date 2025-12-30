import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  ArrowLeft, 
  Check, 
  X,
  MessageCircle,
  Calendar,
  User
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { 
  getNotificationsByUser, 
  markNotificationAsRead,
  Notification 
} from "@/lib/firestore";

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        const userNotifications = await getNotificationsByUser(auth.currentUser.uid);
        setNotifications(userNotifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [navigate]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(unreadNotifications.map(n => markNotificationAsRead(n.id)));
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read when clicked
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }

    // Navigate based on notification type and available IDs
    if (notification.type === 'new_listing_nearby' && notification.listingId) {
      navigate(`/item/${notification.listingId}`);
    } else if (notification.type === 'new_request_nearby' && notification.requestId) {
      navigate(`/requests?requestId=${notification.requestId}`);
    } else if (notification.type === 'message' && notification.chatId) {
      navigate(`/chat/${notification.chatId}`);
    } else if (notification.type === 'rental_request' && notification.transactionId) {
      // Navigate to transaction/booking detail
      navigate(`/transactions?transactionId=${notification.transactionId}`);
    } else if (notification.type === 'transaction_update' && notification.transactionId) {
      navigate(`/transactions?transactionId=${notification.transactionId}`);
    } else if (notification.type === 'request_match' && notification.requestId) {
      navigate(`/requests?requestId=${notification.requestId}`);
    }
    // For other types (verification_approved, verification_rejected), no navigation needed
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'rental_request':
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case 'swap_proposal':
        return <MessageCircle className="h-5 w-5 text-green-500" />;
      case 'transaction_update':
        return <Check className="h-5 w-5 text-orange-500" />;
      case 'message':
        return <MessageCircle className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleString();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading notifications...</p>
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-urbanist font-bold mb-2">
                <span className="gradient-text">Notifications</span>
              </h1>
              <p className="text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
              </p>
            </div>
          </div>
          
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleMarkAllAsRead}
            >
              <Check className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
              <p className="text-muted-foreground">
                You'll see notifications here when someone contacts you about your items or when there are updates to your transactions.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => {
              const isClickable = !!(
                notification.listingId || 
                notification.requestId || 
                notification.transactionId || 
                notification.chatId
              );
              
              return (
                <Card 
                  key={notification.id} 
                  className={`glass-card hover-scale ${!notification.read ? 'border-primary/20 bg-primary/5' : ''} ${isClickable ? 'cursor-pointer' : ''}`}
                  onClick={() => isClickable && handleNotificationClick(notification)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className={`font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {notification.message}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatTime(notification.createdAt)}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <Badge variant="secondary" className="text-xs">
                                New
                              </Badge>
                            )}
                            
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification.id);
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
