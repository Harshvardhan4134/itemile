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
  Settings,
  HelpCircle
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
        <div className="container flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <span className="font-urbanist font-bold text-lg sm:text-xl gradient-text">
            Lendlly
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
        <TooltipProvider>
          <nav className="hidden md:flex items-center space-x-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link 
                  to="/explore" 
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    isActive('/explore') ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Explore
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Browse items available for rent or swap</p>
              </TooltipContent>
            </Tooltip>
            {user && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link 
                      to="/requests" 
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        isActive('/requests') ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      Requests
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View item requests from other users. Post what you need!</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link 
                      to="/transactions" 
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        isActive('/transactions') ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      Transactions
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View your rental and swap transactions</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link 
                      to="/chat" 
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        isActive('/chat') ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      Chat
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Messages with item owners and renters</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link 
                      to="/profile" 
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        isActive('/profile') ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      Profile
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Your account settings and information</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </nav>
        </TooltipProvider>

        {/* Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-3">
          {user ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="relative hover-scale h-8 w-8 sm:h-10 sm:w-10"
                onClick={() => navigate('/notifications')}
              >
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 sm:h-5 sm:w-5 p-0 bg-destructive text-[10px] sm:text-xs flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Badge>
                )}
              </Button>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to="/post" className="hidden md:block">
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity h-8 sm:h-9"
                      >
                        <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        <span className="hidden lg:inline">Post Item</span>
                        <span className="lg:hidden">Post</span>
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>List an item you want to rent out or swap</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to="/post-request" className="hidden lg:block">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors h-8 sm:h-9"
                      >
                        <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        <span className="hidden xl:inline">Post Request</span>
                        <span className="xl:hidden">Request</span>
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Request an item you need - others can offer to rent or swap</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hover-scale h-8 w-8 sm:h-10 sm:w-10">
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs sm:text-sm">
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
              <Link to="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="h-8 sm:h-9">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup" className="hidden sm:block">
                <Button 
                  size="sm" 
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity h-8 sm:h-9"
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
            className="md:hidden h-8 w-8 sm:h-10 sm:w-10"
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
                  <div>
                    <div className="font-semibold">Explore</div>
                    <div className="text-xs text-muted-foreground">Browse items to rent or swap</div>
                  </div>
                </Link>
                {user && (
                  <>
                    <Link 
                      to="/requests" 
                      className="text-sm font-medium py-2 text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div>
                        <div className="font-semibold">Requests</div>
                        <div className="text-xs text-muted-foreground">See what others are looking for</div>
                      </div>
                    </Link>
                    <Link 
                      to="/chat" 
                      className="text-sm font-medium py-2 text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div>
                        <div className="font-semibold">Chat</div>
                        <div className="text-xs text-muted-foreground">Messages with users</div>
                      </div>
                    </Link>
                    <Link 
                      to="/profile" 
                      className="text-sm font-medium py-2 text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div>
                        <div className="font-semibold">Profile</div>
                        <div className="text-xs text-muted-foreground">Your account settings</div>
                      </div>
                    </Link>
                    <Link 
                      to="/dashboard" 
                      className="text-sm font-medium py-2 text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div>
                        <div className="font-semibold">Dashboard</div>
                        <div className="text-xs text-muted-foreground">Manage your listings</div>
                      </div>
                    </Link>
                    <Link 
                      to="/transactions" 
                      className="text-sm font-medium py-2 text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div>
                        <div className="font-semibold">Transactions</div>
                        <div className="text-xs text-muted-foreground">Your rentals and swaps</div>
                      </div>
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
                        <p className="text-xs text-muted-foreground mt-1 ml-1">List an item to rent or swap</p>
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
                        <p className="text-xs text-muted-foreground mt-1 ml-1">Request an item you need</p>
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