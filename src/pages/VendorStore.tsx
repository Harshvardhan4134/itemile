import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Building2, 
  MapPin, 
  Package, 
  ArrowLeft,
  Star,
  CheckCircle,
  Shield
} from "lucide-react";
import { 
  getUser, 
  getListingsByOwner, 
  Listing, 
  User 
} from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";

const VendorStore = () => {
  const { ownerId } = useParams<{ ownerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [owner, setOwner] = useState<User | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!ownerId) {
        toast({
          title: "Error",
          description: "Invalid vendor ID",
          variant: "destructive",
        });
        navigate('/explore');
        return;
      }

      try {
        setLoading(true);
        const [ownerData, listingsData] = await Promise.all([
          getUser(ownerId),
          getListingsByOwner(ownerId),
        ]);

        if (!ownerData) {
          toast({
            title: "Error",
            description: "Vendor not found",
            variant: "destructive",
          });
          navigate('/explore');
          return;
        }

        setOwner(ownerData);
        // Filter to only show available listings
        setListings(listingsData.filter(l => l.available && l.moderation?.status === 'active'));
      } catch (error: any) {
        console.error('Error fetching vendor data:', error);
        toast({
          title: "Error",
          description: "Failed to load vendor store",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ownerId, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading vendor store...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!owner) {
    return null;
  }

  const businessName = owner.businessName || owner.name;
  const isBusiness = owner.isBusinessAccount || listings.length >= 5;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-6 sm:py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/explore')}
          className="mb-4 sm:mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Explore
        </Button>

        {/* Vendor Header */}
        <Card className="glass-card mb-6 sm:mb-8">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                <AvatarImage src={owner.profilePhotoUrl} />
                <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                  <Building2 className="h-10 w-10" />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-bold">{businessName}</h1>
                  {isBusiness && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                      <Building2 className="h-3 w-3 mr-1" />
                      Business Account
                    </Badge>
                  )}
                  {owner.verified && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
                  {owner.businessDescription || `Renting ${listings.length} ${listings.length === 1 ? 'item' : 'items'}`}
                </p>
                
                <div className="flex flex-wrap gap-4 sm:gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{listings.length}</span>
                    <span className="text-muted-foreground">Items Available</span>
                  </div>
                  {owner.rating > 0 && (
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{owner.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground">Rating</span>
                    </div>
                  )}
                  {owner.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Location Available</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Listings Grid */}
        {listings.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Items Available</h3>
              <p className="text-muted-foreground">
                This vendor doesn't have any items available for rent at the moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold">All Items ({listings.length})</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {listings.map((listing) => (
                <Card
                  key={listing.id}
                  className="group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
                  onClick={() => navigate(`/item/${listing.id}`)}
                >
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <img
                      src={listing.images?.[0] || "/placeholder.svg"}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder.svg';
                      }}
                    />
                    {listing.swapAllowed && (
                      <Badge className="absolute top-2 right-2 bg-green-500">
                        SWAP
                      </Badge>
                    )}
                    <Badge variant="secondary" className="absolute top-2 left-2 text-xs bg-black/70 text-white">
                      {listing.category.toUpperCase()}
                    </Badge>
                  </div>
                  <CardContent className="p-3 sm:p-4">
                    <h3 className="font-semibold text-base sm:text-lg mb-1 line-clamp-1">{listing.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 line-clamp-2">{listing.description}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xl sm:text-2xl font-bold text-primary">₹{listing.rentPerDay}</span>
                        <span className="text-xs sm:text-sm text-muted-foreground">/day</span>
                      </div>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VendorStore;

