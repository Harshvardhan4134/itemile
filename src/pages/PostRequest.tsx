import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createRequest, notifyNearbyUsersAboutRequest, getRequest } from "@/lib/firestore";
import { auth } from "@/lib/firebase";
import { GeoPoint } from "firebase/firestore";
import { 
  MapPin,
  Calendar,
  DollarSign,
  Tag,
  Loader2,
  Navigation,
  Search,
  Info,
  AlertCircle
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  isCategoryRestricted, 
  getRestrictedMessage,
  getAllowedDirectListingCategories,
  getAllowedRequestFirstCategories
} from "@/lib/categoryRules";

const PostRequest = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    itemName: "",
    description: "",
    category: "",
    duration: "",
    maxBudget: "",
    location: "",
    lat: "",
    lng: ""
  });
  
  const [gettingLocation, setGettingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Get all allowed categories (both direct listing and request-first are allowed for requests)
  const directListingCategories = getAllowedDirectListingCategories();
  const requestFirstCategories = getAllowedRequestFirstCategories();
  const allAllowedCategories = [...directListingCategories, ...requestFirstCategories];
  
  // Filter out restricted categories and keep some legacy categories for backward compatibility
  const categories = [
    "Photography", "Sports & Outdoor", "Tools", 
    "Music", "Kitchen", "Furniture", "Books", "Clothing", "Fitness"
  ].filter(cat => !isCategoryRestricted(cat));

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation",
        variant: "destructive"
      });
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Use reverse geocoding to get location name
          try {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
            );
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
              const addressComponents = data.results[0].address_components;
              const city = addressComponents.find((component: any) => 
                component.types.includes('locality')
              );
              const state = addressComponents.find((component: any) => 
                component.types.includes('administrative_area_level_1')
              );
              
              const locationName = city ? 
                `${city.long_name}${state ? `, ${state.long_name}` : ''}` : 
                data.results[0].formatted_address;
              
              handleInputChange("location", locationName);
            } else {
              handleInputChange("location", `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            }
          } catch {
            handleInputChange("location", `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
          
          handleInputChange("lat", latitude.toString());
          handleInputChange("lng", longitude.toString());
          
        } catch (error) {
          console.error('Error getting location:', error);
          toast({
            title: "Error",
            description: "Failed to get your location",
            variant: "destructive"
          });
        } finally {
          setGettingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast({
          title: "Location access denied",
          description: "Please enable location access or enter coordinates manually",
          variant: "destructive"
        });
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auth.currentUser) {
      toast({
        title: "Authentication required",
        description: "Please log in to post a request",
        variant: "destructive"
      });
      return;
    }

    // Validation
    if (!formData.itemName.trim()) {
      toast({
        title: "Item name required",
        description: "Please enter what you're looking for",
        variant: "destructive"
      });
      return;
    }

    if (!formData.category) {
      toast({
        title: "Category required",
        description: "Please select a category",
        variant: "destructive"
      });
      return;
    }

    // Check if category is restricted
    if (isCategoryRestricted(formData.category)) {
      toast({
        title: "Category Not Allowed",
        description: getRestrictedMessage(formData.category),
        variant: "destructive"
      });
      return;
    }

    if (!formData.duration || Number(formData.duration) <= 0) {
      toast({
        title: "Duration required",
        description: "Please enter how many days you need the item",
        variant: "destructive"
      });
      return;
    }

    if (!formData.lat || !formData.lng) {
      toast({
        title: "Location required",
        description: "Please select your location",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      // Create request data
      const requestData = {
        userId: auth.currentUser.uid,
        itemName: formData.itemName.trim(),
        description: formData.description.trim(),
        category: formData.category,
        duration: Number(formData.duration),
        maxBudget: formData.maxBudget ? Number(formData.maxBudget) : undefined,
        location: new GeoPoint(Number(formData.lat), Number(formData.lng))
      };

      // Save to Firestore
      const requestId = await createRequest(requestData);
      
      // Get the created request to notify nearby users
      const createdRequest = await getRequest(requestId);
      
      // Notify nearby users about the new request (run in background)
      if (createdRequest) {
        notifyNearbyUsersAboutRequest(createdRequest).catch(error => {
          console.error('Error notifying nearby users:', error);
          // Don't fail the whole request if notification fails
        });
      }

      toast({
        title: "Request posted successfully!",
        description: "Your request is now visible to nearby users who might have what you need."
      });

      navigate('/requests');
    } catch (error) {
      console.error('Error creating request:', error);
      toast({
        title: "Error",
        description: "Failed to post request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-urbanist font-bold mb-4">
              Request an <span className="gradient-text">Item</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Looking for something? Let others know what you need
            </p>
          </div>

          {/* Info Card explaining Requests */}
          <Alert className="mb-6 border-primary/20 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertTitle className="text-base font-semibold mb-2">How Requests Work</AlertTitle>
            <AlertDescription className="text-sm space-y-2">
              <p>
                <strong>Post a Request:</strong> Tell the community what item you need. Others who have that item can respond to your request.
              </p>
              <p>
                <strong>Get Responses:</strong> Users who have the item you're looking for can contact you to offer it for rent or swap.
              </p>
              <p>
                <strong>Connect & Rent:</strong> Chat with responders, agree on terms, and complete your rental or swap!
              </p>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="h-5 w-5 mr-2" />
                  What are you looking for?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="itemName">Item Name *</Label>
                    <Input
                      id="itemName"
                      placeholder="e.g., DSLR Camera, Gaming Console"
                      value={formData.itemName}
                      onChange={(e) => handleInputChange("itemName", e.target.value)}
                      className="glass-effect border-0"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select onValueChange={(value) => handleInputChange("category", value)} value={formData.category}>
                      <SelectTrigger className="glass-effect border-0">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.category && isCategoryRestricted(formData.category) && (
                      <Alert className="mt-2 border-destructive/20 bg-destructive/5">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <AlertDescription className="text-xs">
                          {getRestrictedMessage(formData.category)}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what you're looking for, any specific requirements, or conditions..."
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="glass-effect border-0 min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Duration and Budget */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Duration & Budget
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (days) *</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      placeholder="How many days do you need it?"
                      value={formData.duration}
                      onChange={(e) => handleInputChange("duration", e.target.value)}
                      className="glass-effect border-0"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maxBudget">Max Budget (₹/day) - Optional</Label>
                    <Input
                      id="maxBudget"
                      type="number"
                      min="0"
                      placeholder="Your budget per day"
                      value={formData.maxBudget}
                      onChange={(e) => handleInputChange("maxBudget", e.target.value)}
                      className="glass-effect border-0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={gettingLocation}
                      variant="outline"
                      className="glass-effect border-0 flex-1"
                    >
                      {gettingLocation ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Navigation className="h-4 w-4 mr-2" />
                      )}
                      {gettingLocation ? "Getting Location..." : "Use Current Location"}
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location Name</Label>
                      <Input
                        id="location"
                        placeholder="Your city or area"
                        value={formData.location}
                        onChange={(e) => handleInputChange("location", e.target.value)}
                        className="glass-effect border-0"
                        readOnly
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="lat">Latitude</Label>
                        <Input
                          id="lat"
                          type="number"
                          step="any"
                          placeholder="Latitude"
                          value={formData.lat}
                          onChange={(e) => handleInputChange("lat", e.target.value)}
                          className="glass-effect border-0"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="lng">Longitude</Label>
                        <Input
                          id="lng"
                          type="number"
                          step="any"
                          placeholder="Longitude"
                          value={formData.lng}
                          onChange={(e) => handleInputChange("lng", e.target.value)}
                          className="glass-effect border-0"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-center space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/explore')}
                className="glass-effect border-0"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity px-8"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Posting Request...
                  </>
                ) : (
                  "Post Request"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PostRequest;
