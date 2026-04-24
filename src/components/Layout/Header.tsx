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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  HelpCircle,
  Receipt
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
import { CitySelectorDialog } from "@/components/CitySelectorDialog";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showPostChooser, setShowPostChooser] = useState(false);
  const [cityDialogOpen, setCityDialogOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("lendlly_selected_city");
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isActive = (path: string) => location.pathname === path;
  const isChatSection = location.pathname.startsWith("/chat");

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

  useEffect(() => {
    if (!selectedCity) {
      // Auto-prompt city picker on first visit when none is set
      setCityDialogOpen(true);
    }
  }, [selectedCity]);

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    if (typeof window !== "undefined") {
      localStorage.setItem("lendlly_selected_city", city);
      window.dispatchEvent(
        new CustomEvent("lendlly-city-changed", { detail: { city } })
      );
    }
  };

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
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80">
        <div className="container px-4 sm:px-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] h-14 sm:h-16 items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9 shrink-0 -ml-1"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-expanded={isMenuOpen}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <TooltipProvider>
                <nav className="hidden md:flex items-center gap-8">
                  <Link
                    to="/"
                    className={`text-sm font-medium transition-colors hover:text-foreground ${
                      isActive("/") ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Home
                  </Link>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to="/explore"
                        className={`text-sm font-medium transition-colors hover:text-foreground ${
                          isActive("/explore") ? "text-foreground" : "text-muted-foreground"
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
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          to="/requests"
                          className={`text-sm font-medium transition-colors hover:text-foreground ${
                            isActive("/requests") ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          Requests
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View item requests from other users</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </nav>
              </TooltipProvider>
            </div>

            <Link
              to="/"
              className="justify-self-center font-semibold text-base sm:text-lg tracking-tight text-foreground whitespace-nowrap hover:opacity-80 transition-opacity"
            >
              Lendlly
            </Link>

            <div className="flex items-center justify-end gap-1 sm:gap-2 md:gap-3 min-w-0">
              <Button
                variant="outline"
                size="sm"
                className="hidden lg:inline-flex items-center gap-2 max-w-[160px] xl:max-w-[200px]"
                onClick={() => setCityDialogOpen(true)}
              >
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate text-xs xl:text-sm">
                  {selectedCity ? selectedCity : "City"}
                </span>
              </Button>

              <div className="hidden md:flex flex-1 max-w-xs min-w-0 mx-1">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search…"
                    className="pl-9 h-9 text-sm bg-muted/50 border-border"
                  />
                </div>
              </div>

              <TooltipProvider>
                <nav className="hidden lg:flex items-center gap-8 mr-1">
                  <Link
                    to="/contact"
                    className={`text-sm font-medium transition-colors hover:text-foreground ${
                      isActive("/contact") ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Contact
                  </Link>
                  {user && (
                    <Link
                      to="/chat"
                      className={`text-sm font-medium transition-colors hover:text-foreground ${
                        isChatSection ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      Messages
                    </Link>
                  )}
                </nav>
              </TooltipProvider>
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
                    <Button 
                      size="sm" 
                      className="bg-primary hover:bg-primary/90 transition-opacity h-8 sm:h-9 text-white hidden md:inline-flex"
                      onClick={() => setShowPostChooser(true)}
                    >
                      <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                      <span className="hidden lg:inline">Post Item</span>
                      <span className="lg:hidden">Post</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>List an item or post a request</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hover-scale h-8 w-8 sm:h-10 sm:w-10">
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                      <AvatarFallback className="bg-muted text-foreground text-xs sm:text-sm">
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
                  <DropdownMenuItem asChild>
                    <Link to="/transactions" className="cursor-pointer">
                      <Receipt className="mr-2 h-4 w-4" />
                      <span>Transactions</span>
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
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 sm:h-9">
                  Sign Up
                </Button>
              </Link>
            </>
          )}
            </div>
          </div>
        </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border bg-card">
          <div className="container px-4 sm:px-6 py-4">
            <div className="flex flex-col space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items, brands, or categories..."
                  className="pl-10 bg-muted/50 border-border"
                />
              </div>
              <Button
                variant="outline"
                className="justify-start gap-2"
                onClick={() => setCityDialogOpen(true)}
              >
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {selectedCity ? selectedCity : "Select your city"}
                </span>
              </Button>
              <nav className="flex flex-col space-y-2">
                <Link
                  to="/"
                  className="text-sm font-medium py-2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div>
                    <div className="font-semibold">Home</div>
                    <div className="text-xs text-muted-foreground">Landing page</div>
                  </div>
                </Link>
                <Link 
                  to="/explore" 
                  className="text-sm font-medium py-2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div>
                    <div className="font-semibold">Explore</div>
                    <div className="text-xs text-muted-foreground">Browse items to rent or swap</div>
                  </div>
                </Link>
                <Link
                  to="/contact"
                  className="text-sm font-medium py-2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div>
                    <div className="font-semibold">Contact</div>
                    <div className="text-xs text-muted-foreground">Get in touch</div>
                  </div>
                </Link>
                {user && (
                  <>
                    <Link 
                      to="/requests" 
                      className="text-sm font-medium py-2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div>
                        <div className="font-semibold">Requests</div>
                        <div className="text-xs text-muted-foreground">See what others are looking for</div>
                      </div>
                    </Link>
                    <Link 
                      to="/chat" 
                      className="text-sm font-medium py-2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div>
                        <div className="font-semibold">Chat</div>
                        <div className="text-xs text-muted-foreground">Messages with users</div>
                      </div>
                    </Link>
                    <Link 
                      to="/profile" 
                      className="text-sm font-medium py-2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div>
                        <div className="font-semibold">Profile</div>
                        <div className="text-xs text-muted-foreground">Your account settings</div>
                      </div>
                    </Link>
                    <Link 
                      to="/dashboard" 
                      className="text-sm font-medium py-2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div>
                        <div className="font-semibold">Dashboard</div>
                        <div className="text-xs text-muted-foreground">Manage your listings</div>
                      </div>
                    </Link>
                    
                    {/* Mobile Post Button */}
                    <div className="flex flex-col space-y-2 pt-2 border-t border-border/40">
                      <Button 
                        size="sm" 
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
                        onClick={() => {
                          setIsMenuOpen(false);
                          setShowPostChooser(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Post
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1 ml-1">List an item or post a request</p>
                    </div>
                  </>
                )}
                {!user && (
                  <>
                    <Link 
                      to="/login" 
                      className="text-sm font-medium py-2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link 
                      to="/signup" 
                      className="text-sm font-medium py-2 text-muted-foreground hover:text-foreground transition-colors"
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

      <CitySelectorDialog
        open={cityDialogOpen}
        onOpenChange={setCityDialogOpen}
        selectedCity={selectedCity}
        onSelectCity={handleCitySelect}
      />

      {/* Post chooser dialog */}
      <Dialog open={showPostChooser} onOpenChange={setShowPostChooser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>What would you like to post?</DialogTitle>
            <DialogDescription>
              Choose whether you want to list an item for rent or request an item.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button className="w-full" onClick={() => { setShowPostChooser(false); navigate('/post'); }}>
              Item for Rent
            </Button>
            <Button variant="outline" className="w-full" onClick={() => { setShowPostChooser(false); navigate('/post-request'); }}>
              Request an Item
            </Button>
          </div>
          <DialogFooter />
        </DialogContent>
      </Dialog>

      {userData && (
        <VerificationBanner 
          verificationStatus={userData.verificationStatus}
          rejectionReason={userData.rejectionReason}
          kycExempt={userData.kycExempt}
        />
      )}
    </>
  );
};