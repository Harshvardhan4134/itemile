import { useState, useEffect } from "react";
import { Header } from "@/components/Layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link, useNavigate } from "react-router-dom";
import LiveMap from "@/components/LiveMap";
import { getListings, Listing, getAllRequests, Request } from "@/lib/firestore";
import { 
  MapPin, 
  Search, 
  Filter, 
  Star, 
  Camera,
  Bike,
  Smartphone,
  X
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const Explore = () => {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState<Listing | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: "",
    minPrice: "",
    maxPrice: "",
    swapOnly: false
  });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [attemptedGeolocation, setAttemptedGeolocation] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const listingsPromise = getListings();
        const requestsPromise = isAuthenticated ? getAllRequests() : Promise.resolve<Request[]>([]);

        const [listingsData, requestsData] = await Promise.all([listingsPromise, requestsPromise]);

        if (!isMounted) return;

        setListings(listingsData);
        setRequests(requestsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        if (!isMounted) return;
        setRequests([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const filteredItems = listings.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !filters.category || item.category === filters.category;
    const matchesPrice = (!filters.minPrice || item.rentPerDay >= Number(filters.minPrice)) &&
                        (!filters.maxPrice || item.rentPerDay <= Number(filters.maxPrice));
    const matchesSwap = !filters.swapOnly || item.swapAllowed;
    
    return matchesSearch && matchesCategory && matchesPrice && matchesSwap;
  });

  const handleListingSelect = (listing: Listing) => {
    setSelectedItem(listing);
  };

  const handleRequestSelect = (request: Request) => {
    if (!isAuthenticated) {
      setSelectedItem(null);
      return navigate("/login", { state: { from: `/requests#${request.id}` } });
    }
    navigate(`/requests#${request.id}`);
  };

  const handleLocationUpdate = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser.');
      setAttemptedGeolocation(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setAttemptedGeolocation(true);
      },
      (err) => {
        // Only log error details if it's not a permission denied (common case)
        if (err.code !== err.PERMISSION_DENIED) {
          console.warn('Error getting current position:', err.message || err);
        }
        setAttemptedGeolocation(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    // Try to get location on mount so initial map centers on user
    handleLocationUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
        {/* Map Section */}
        <div className="flex-1 relative min-h-[50vh] lg:min-h-full">
          {/* Search Overlay */}
          <div className="absolute top-4 left-4 right-4 z-[1000]">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items on map..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 glass-effect border-0 shadow-lg"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="glass-effect hover-scale"
                onClick={() => setShowFilters(true)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Map */}
          <div className="h-full w-full rounded-lg overflow-hidden">
            {loading ? (
              <div className="h-full w-full bg-muted/20 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Loading map...</p>
                </div>
              </div>
            ) : (
              attemptedGeolocation ? (
                <LiveMap 
                  listings={filteredItems}
                  requests={requests}
                  onListingSelect={handleListingSelect}
                  onRequestSelect={handleRequestSelect}
                  center={userLocation || { lat: 37.7749, lng: -122.4194 }}
                  zoom={12}
                  userLocation={userLocation}
                  onLocationUpdate={handleLocationUpdate}
                />
              ) : (
                <div className="h-full w-full bg-muted/20 flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-muted-foreground">Getting your location...</p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border bg-card p-4 overflow-y-auto max-h-[50vh] lg:max-h-none">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-urbanist font-bold text-xl">
                Items Near You
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden"
                onClick={() => setShowFilters(true)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">
              {filteredItems.length} items found
            </p>
          </div>

          <div className="space-y-4">
            {filteredItems.map((item) => (
              <Card 
                key={item.id} 
                className={`hover-scale cursor-pointer transition-all ${
                  selectedItem?.id === item.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedItem(item)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <img 
                      src={item.images[0] || "/placeholder.svg"} 
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate mb-1">
                        {item.title}
                      </h3>
                      <div className="flex gap-1 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                        {item.swapAllowed && (
                          <Badge variant="outline" className="text-xs text-green-600">
                            SWAP
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {item.location ? `${item.location.latitude.toFixed(6)}, ${item.location.longitude.toFixed(6)}` : 'Location not set'}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-semibold text-primary">
                          ₹{item.rentPerDay}/day
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Available: {item.available ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" className="w-full mt-3" asChild>
                    <Link to={`/item/${item.id}`}>
                      View Details
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Filters Sheet */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filter Items</SheetTitle>
          </SheetHeader>
          <div className="py-6 space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <select 
                className="w-full p-2 border rounded-md"
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">All Categories</option>
                <option value="Photography">Photography</option>
                <option value="Sports">Sports</option>
                <option value="Electronics">Electronics</option>
                <option value="Tools">Tools</option>
                <option value="Gaming">Gaming</option>
                <option value="Music">Music</option>
                <option value="Kitchen">Kitchen</option>
                <option value="Furniture">Furniture</option>
                <option value="Books">Books</option>
                <option value="Clothing">Clothing</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Price Range</label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Min" 
                  type="number" 
                  value={filters.minPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                />
                <Input 
                  placeholder="Max" 
                  type="number" 
                  value={filters.maxPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <label className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  className="rounded"
                  checked={filters.swapOnly}
                  onChange={(e) => setFilters(prev => ({ ...prev, swapOnly: e.target.checked }))}
                />
                <span className="text-sm">Swap Only</span>
              </label>
            </div>
            
            <Button 
              className="w-full"
              onClick={() => setShowFilters(false)}
            >
              Apply Filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Selected Item Detail (Mobile) */}
      {selectedItem && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[1001]">
          <Card className="rounded-t-2xl rounded-b-none glass-card">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold">{selectedItem.title}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedItem(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-3">
                <img 
                  src={selectedItem.images[0] || "/placeholder.svg"} 
                  alt={selectedItem.title}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <div className="flex gap-1 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {selectedItem.category}
                    </Badge>
                    {selectedItem.swapAllowed && (
                      <Badge variant="outline" className="text-xs text-green-600">
                        SWAP
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {selectedItem.location ? `${selectedItem.location.latitude.toFixed(6)}, ${selectedItem.location.longitude.toFixed(6)}` : 'Location not set'}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-lg text-primary">
                      ₹{selectedItem.rentPerDay}/day
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Available: {selectedItem.available ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
              <Button className="w-full mt-3" asChild>
                <Link to={`/item/${selectedItem.id}`}>
                  View Full Details
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Explore;