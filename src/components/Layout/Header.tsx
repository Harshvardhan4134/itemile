import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Plus, 
  User, 
  Bell, 
  Menu,
  MapPin,
  MessageCircle,
  LogOut,
  Settings
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { getUnreadNotificationCount, subscribeToNotifications, getUser } from "@/lib/firestore";
import { VerificationBanner } from "@/components/VerificationBanner";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        // Get user data for verification status
        const data = await getUser(user.uid);
        setUserData(data);
        
        // Subscribe to real-time notification count
        const notificationUnsubscribe = subscribeToNotifications(user.uid, (count) => {
          setNotificationCount(count);
        });
        
        return () => notificationUnsubscribe();
      } else {
        setNotificationCount(0);
        setUserData(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
      toast({
        title: "Logged out",
        description: "You have been successfully logged out"
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 glass-card">
        <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <span className="font-urbanist font-bold text-xl gradient-text">
            Rent Share
          </span>
        </Link>

        {/* Search Bar - Hidden on mobile */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items to rent or swap..."
              className="pl-10 glass-effect border-0 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Navigation - Desktop */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link 
            to="/explore" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive('/explore') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Explore
          </Link>
          {user && (
            <>
              <Link 
                to="/requests" 
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive('/requests') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Requests
              </Link>
              <Link 
                to="/transactions" 
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive('/transactions') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Transactions
              </Link>
              <Link 
                to="/chat" 
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive('/chat') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Chat
              </Link>
              <Link 
                to="/profile" 
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive('/profile') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Profile
              </Link>
            </>
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {user ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="relative hover-scale"
                onClick={() => navigate('/notifications')}
              >
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-destructive text-xs flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Badge>
                )}
              </Button>
              
              <Link to="/post">
                <Button 
                  size="sm" 
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Post Item</span>
                </Button>
              </Link>
              
              <Link to="/post-request">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Post Request</span>
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hover-scale">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-sm">
                        {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user.displayName || 'User'}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/chat" className="cursor-pointer">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      <span>Messages</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button 
                  size="sm" 
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                >
                  Sign Up
                </Button>
              </Link>
            </>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border/40 glass-card">
          <div className="container py-4">
            <div className="flex flex-col space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  className="pl-10 glass-effect border-0"
                />
              </div>
              <nav className="flex flex-col space-y-2">
                <Link 
                  to="/explore" 
                  className="text-sm font-medium py-2 text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Explore
                </Link>
                {user && (
                  <>
                    <Link 
                      to="/requests" 
                      className="text-sm font-medium py-2 text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Requests
                    </Link>
                    <Link 
                      to="/chat" 
                      className="text-sm font-medium py-2 text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Chat
                    </Link>
                    <Link 
                      to="/profile" 
                      className="text-sm font-medium py-2 text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link 
                      to="/dashboard" 
                      className="text-sm font-medium py-2 text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link 
                      to="/transactions" 
                      className="text-sm font-medium py-2 text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Transactions
                    </Link>
                    
                    {/* Mobile Post Buttons */}
                    <div className="flex flex-col space-y-2 pt-2 border-t border-border/40">
                      <Link to="/post" onClick={() => setIsMenuOpen(false)}>
                        <Button 
                          size="sm" 
                          className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Post Item
                        </Button>
                      </Link>
                      <Link to="/post-request" onClick={() => setIsMenuOpen(false)}>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Post Request
                        </Button>
                      </Link>
                    </div>
                  </>
                )}
                {!user && (
                  <>
                    <Link 
                      to="/login" 
                      className="text-sm font-medium py-2 text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link 
                      to="/signup" 
                      className="text-sm font-medium py-2 text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </div>
        </div>
      )}
      </header>
      {userData && (
        <VerificationBanner 
          verificationStatus={userData.verificationStatus}
          rejectionReason={userData.rejectionReason}
        />
      )}
    </>
  );
};