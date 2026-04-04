import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { createListing } from "@/lib/firestore";
import { uploadToCloudinary, uploadMultipleImages } from "@/lib/cloudinary";
import { auth } from "@/lib/firebase";
import { GeoPoint } from "firebase/firestore";
import {
  Upload,
  Plus,
  X,
  Calendar as CalendarIcon,
  MapPin,
  DollarSign,
  Tag,
  Image as ImageIcon,
  CheckCircle,
  Video,
  Loader2,
  Navigation,
} from "lucide-react";
import LocationPickerMap from "@/components/LocationPickerMap";
import { getCityNameFromCoordinates } from "@/lib/utils";
import { 
  getCategoryListingType, 
  isCategoryRestricted, 
  isRequestFirstAllowed,
  isDirectListingAllowed,
  getRequestFirstMessage,
  getRestrictedMessage,
  getAllowedDirectListingCategories,
  getAllowedRequestFirstCategories
} from "@/lib/categoryRules";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info, Shield } from "lucide-react";

const PostItem = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    rentPerDay: "",
    location: "",
    lat: "",
    lng: "",
    swapAllowed: false,
    availability: null as Date | null,
    features: [] as string[],
    policies: [] as string[]
  });
  
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [newFeature, setNewFeature] = useState("");
  const [newPolicy, setNewPolicy] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [mapSelectedCoords, setMapSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [showRequestFirstDialog, setShowRequestFirstDialog] = useState(false);
  const [requestEnabled, setRequestEnabled] = useState(false);
  const [selectedCategoryType, setSelectedCategoryType] = useState<'direct' | 'request-only' | 'restricted' | null>(null);

  // Get all allowed categories (direct listing + request-first)
  const directListingCategories = getAllowedDirectListingCategories();
  const requestFirstCategories = getAllowedRequestFirstCategories();
  const allAllowedCategories = [...directListingCategories, ...requestFirstCategories];
  
  // Keep some legacy categories for backward compatibility, but filter restricted ones
  // Include approval-required categories (they'll need admin approval before going live)
  const categories = [
    "Electronics", "Photography", "Sports & Outdoor", "Tools", 
    "Music", "Kitchen", "Furniture", "Books", "Clothing", "Fitness",
    "Drones", "Professional Equipment"
  ].filter(cat => !isCategoryRestricted(cat));

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (category: string) => {
    const categoryType = getCategoryListingType(category);
    setSelectedCategoryType(categoryType);
    
    if (isCategoryRestricted(category)) {
      toast({
        title: "Category Not Allowed",
        description: getRestrictedMessage(category),
        variant: "destructive"
      });
      handleInputChange("category", "");
      return;
    }
    
    if (isRequestFirstAllowed(category)) {
      // Show dialog for request-first items
      setShowRequestFirstDialog(true);
      setRequestEnabled(false); // Reset request enabled state
    }
    
    handleInputChange("category", category);
  };

  const handleEnableRequests = () => {
    setRequestEnabled(true);
    setShowRequestFirstDialog(false);
    toast({
      title: "Requests Enabled",
      description: "Your item will be available for requests. Nearby users can request it, and you'll be notified.",
    });
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      handleInputChange("features", [...formData.features, newFeature.trim()]);
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    handleInputChange("features", formData.features.filter((_, i) => i !== index));
  };

  const addPolicy = () => {
    if (newPolicy.trim()) {
      handleInputChange("policies", [...formData.policies, newPolicy.trim()]);
      setNewPolicy("");
    }
  };

  const removePolicy = (index: number) => {
    handleInputChange("policies", formData.policies.filter((_, i) => i !== index));
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
        const { latitude, longitude } = position.coords;
        handleInputChange("lat", latitude.toString());
        handleInputChange("lng", longitude.toString());
        try {
          const readableLocation = await getCityNameFromCoordinates(latitude, longitude);
          handleInputChange("location", readableLocation);
        } catch (err) {
          console.error("Failed to fetch location name:", err);
          handleInputChange("location", `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }

        toast({
          title: "Location obtained",
          description: `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`,
        });
        setGettingLocation(false);
      },
      (error) => {
        let errorMessage = "Failed to get location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied by user";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
        }
        
        toast({
          title: "Location error",
          description: errorMessage,
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setImages(prev => [...prev, ...files]);
      // Create preview URLs
      const newUrls = files.map(file => URL.createObjectURL(file));
      setImageUrls(prev => [...prev, ...newUrls]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoUrl("");
  };

  const openMapPicker = () => {
    const lat = parseFloat(formData.lat);
    const lng = parseFloat(formData.lng);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      setMapSelectedCoords({ lat, lng });
    } else {
      setMapSelectedCoords(null);
    }
    setIsLocationPickerOpen(true);
  };

  const handleConfirmMapLocation = async () => {
    if (!mapSelectedCoords) {
      setIsLocationPickerOpen(false);
      return;
    }

    setResolvingAddress(true);
    handleInputChange("lat", mapSelectedCoords.lat.toFixed(6));
    handleInputChange("lng", mapSelectedCoords.lng.toFixed(6));

    try {
      const readableLocation = await getCityNameFromCoordinates(mapSelectedCoords.lat, mapSelectedCoords.lng);
      handleInputChange("location", readableLocation);
    } catch (error) {
      console.error("Failed to fetch location name:", error);
      handleInputChange(
        "location",
        `${mapSelectedCoords.lat.toFixed(6)}, ${mapSelectedCoords.lng.toFixed(6)}`
      );
    } finally {
      setResolvingAddress(false);
      setIsLocationPickerOpen(false);
    }

    toast({
      title: "Location pinned",
      description: `Lat: ${mapSelectedCoords.lat.toFixed(6)}, Lng: ${mapSelectedCoords.lng.toFixed(6)}`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auth.currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to create a listing",
        variant: "destructive"
      });
      return;
    }

    if (images.length === 0) {
      toast({
        title: "Error",
        description: "Please upload at least one image",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      // Upload images to Cloudinary
      setUploading(true);
      const uploadedImageUrls = await uploadMultipleImages(images, 'rent-share/listings');
      
      // Upload video if provided
      let uploadedVideoUrl = "";
      if (videoFile) {
        const videoResult = await uploadToCloudinary(videoFile, 'rent-share/videos');
        uploadedVideoUrl = videoResult.secure_url;
      }

      // Validate category restrictions before submitting
      if (isCategoryRestricted(formData.category)) {
        toast({
          title: "Category Not Allowed",
          description: getRestrictedMessage(formData.category),
          variant: "destructive"
        });
        setSubmitting(false);
        setUploading(false);
        return;
      }

      // Determine listing type
      const listingType = isRequestFirstAllowed(formData.category) ? 'request-only' : 'direct';
      
      // For request-first items, ensure requests are enabled
      if (listingType === 'request-only' && !requestEnabled) {
        toast({
          title: "Enable Requests Required",
          description: "Please enable requests for this item to proceed.",
          variant: "destructive"
        });
        setSubmitting(false);
        setUploading(false);
        return;
      }

      // ALL listings require admin approval before going live
      // Create listing data
      const listingData: any = {
        ownerId: auth.currentUser.uid,
        title: formData.title,
        description: formData.description,
        rentPerDay: Number(formData.rentPerDay),
        swapAllowed: formData.swapAllowed,
        category: formData.category,
        location: new GeoPoint(Number(formData.lat), Number(formData.lng)),
        images: uploadedImageUrls,
        videoProof: uploadedVideoUrl,
        available: false, // ALL items require approval - set to false initially
        listingType: listingType,
        moderation: {
          status: 'pending_review' // ALL items need admin approval
        }
      };

      // Only add requestEnabled if listingType is 'request-only' (don't include undefined values)
      if (listingType === 'request-only') {
        listingData.requestEnabled = requestEnabled;
      }

      // Save to Firestore
      await createListing(listingData);

      const successMessage = listingType === 'request-only' 
        ? "Your item has been submitted for admin approval. Once approved by admin, users will be able to see and request your item!"
        : "Your listing has been submitted and is pending admin approval. Once approved by admin, users will be able to see your item on the explore page!";

      toast({
        title: "Listing submitted for approval!",
        description: successMessage
      });

      navigate('/explore');
    } catch (error) {
      console.error('Error creating listing:', error);
      toast({
        title: "Error",
        description: "Failed to create listing. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

  return (
    <>
    <div className="app-shell">
      <Header />
      
      <div className="container py-4 sm:py-6 md:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6 sm:mb-8 px-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-urbanist font-bold mb-3 sm:mb-4">
              List Your <span className="gradient-text">Item</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
              Share your items with the community and start earning
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 px-4 sm:px-0">
            {/* Basic Information */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Tag className="h-5 w-5 mr-2" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm sm:text-base">Item Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Canon EOS R5 Camera"
                      value={formData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                      className="glass-effect border-0 h-10 sm:h-11 text-sm sm:text-base"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm sm:text-base">Category *</Label>
                    <Select onValueChange={handleCategoryChange} value={formData.category}>
                      <SelectTrigger className="glass-effect border-0 h-10 sm:h-11 text-sm sm:text-base">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category} className="text-sm sm:text-base">
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.category && selectedCategoryType === 'request-only' && requestEnabled && (
                      <Alert className="mt-2 border-primary/20 bg-primary/5">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertDescription className="text-xs">
                          This item will work on a request-first basis. It won't appear in public listings, but nearby users can request it.
                        </AlertDescription>
                      </Alert>
                    )}
                    {formData.category && selectedCategoryType === 'restricted' && (
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
                  <Label htmlFor="description" className="text-sm sm:text-base">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your item, its condition, and what's included..."
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="glass-effect border-0 min-h-[100px] sm:min-h-[120px] text-sm sm:text-base"
                    required
                  />
                </div>

                <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="rentPerDay" className="text-sm sm:text-base">Daily Rate (₹) *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                      <Input
                        id="rentPerDay"
                        type="number"
                        placeholder="25"
                        value={formData.rentPerDay}
                        onChange={(e) => handleInputChange("rentPerDay", e.target.value)}
                        className="pl-9 sm:pl-10 glass-effect border-0 h-10 sm:h-11 text-sm sm:text-base"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm sm:text-base">Location *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                      <Input
                        id="location"
                        placeholder="Downtown, City"
                        value={formData.location}
                        onChange={(e) => handleInputChange("location", e.target.value)}
                        className="pl-9 sm:pl-10 glass-effect border-0 h-10 sm:h-11 text-sm sm:text-base"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Label className="text-sm sm:text-base font-medium">Location Coordinates</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={getCurrentLocation}
                        disabled={gettingLocation}
                        className="glass-effect h-9 sm:h-10 text-xs sm:text-sm"
                      >
                        {gettingLocation ? (
                          <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                        ) : (
                          <Navigation className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        )}
                        <span className="hidden sm:inline">{gettingLocation ? "Getting Location..." : "Get Current Location"}</span>
                        <span className="sm:hidden">{gettingLocation ? "Getting..." : "Get Location"}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={openMapPicker}
                        className="glass-effect h-9 sm:h-10 text-xs sm:text-sm"
                      >
                        <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        <span className="hidden sm:inline">Pin on Map</span>
                        <span className="sm:hidden">Pin Map</span>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="lat" className="text-sm sm:text-base">Latitude *</Label>
                      <Input
                        id="lat"
                        type="number"
                        step="any"
                        placeholder="28.6139"
                        value={formData.lat}
                        onChange={(e) => handleInputChange("lat", e.target.value)}
                        className="glass-effect border-0 h-10 sm:h-11 text-sm sm:text-base"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lng" className="text-sm sm:text-base">Longitude *</Label>
                      <Input
                        id="lng"
                        type="number"
                        step="any"
                        placeholder="77.2090"
                        value={formData.lng}
                        onChange={(e) => handleInputChange("lng", e.target.value)}
                        className="glass-effect border-0 h-10 sm:h-11 text-sm sm:text-base"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    <p>💡 Tip: Click "Get Current Location" to automatically fill in your coordinates, or enter them manually.</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="swapAllowed"
                    checked={formData.swapAllowed}
                    onCheckedChange={(checked) => handleInputChange("swapAllowed", checked)}
                  />
                  <Label htmlFor="swapAllowed">Allow swapping for this item</Label>
                </div>
              </CardContent>
            </Card>

            {/* Images */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Photos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imageUrls.map((imageUrl, index) => (
                    <div key={index} className="relative aspect-square">
                      <img 
                        src={imageUrl} 
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  
                  {images.length < 8 && (
                    <label className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary transition-colors glass-effect cursor-pointer">
                      <Upload className="h-6 w-6 mb-2" />
                      <span className="text-xs">Add Photo</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Add up to 8 photos. First photo will be the main image.
                </p>
              </CardContent>
            </Card>

            {/* Video Upload */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Video className="h-5 w-5 mr-2" />
                  360° Video Proof (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {videoUrl ? (
                  <div className="relative">
                    <video 
                      src={videoUrl} 
                      controls
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={removeVideo}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <label className="block w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary transition-colors cursor-pointer">
                    <Video className="h-8 w-8 mb-2" />
                    <span className="text-sm">Upload 360° Video Proof</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                  </label>
                )}
                <p className="text-sm text-muted-foreground">
                  Upload a 360° video to prove item authenticity and build trust.
                </p>
              </CardContent>
            </Card>

            {/* Features & Specs */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Features & Specifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., 45MP Full-Frame Sensor"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    className="glass-effect border-0"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                  />
                  <Button type="button" onClick={addFeature} size="icon" variant="outline" className="glass-effect">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {formData.features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="glass-effect">
                      {feature}
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Availability */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  Availability
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Generally Available From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal glass-effect border-0"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.availability ? (
                          formData.availability.toDateString()
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.availability}
                        onSelect={(date) => handleInputChange("availability", date)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>

            {/* Rental Policies */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Rental Policies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., No smoking around equipment"
                    value={newPolicy}
                    onChange={(e) => setNewPolicy(e.target.value)}
                    className="glass-effect border-0"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPolicy())}
                  />
                  <Button type="button" onClick={addPolicy} size="icon" variant="outline" className="glass-effect">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {formData.policies.map((policy, index) => (
                    <div key={index} className="flex items-center justify-between p-3 glass-effect rounded-lg">
                      <span className="text-sm">{policy}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePolicy(index)}
                        className="h-8 w-8"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <CheckCircle className="h-12 w-12 text-primary mx-auto" />
                  <h3 className="font-semibold text-lg">Ready to List Your Item?</h3>
                  <p className="text-muted-foreground">
                    Your item will be reviewed and published within 24 hours
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button 
                      type="submit" 
                      size="lg"
                      disabled={submitting || uploading}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {submitting || uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {uploading ? 'Uploading...' : 'Publishing...'}
                        </>
                      ) : (
                        'Publish Item'
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="lg" 
                      className="glass-effect"
                      disabled={submitting || uploading}
                    >
                      Save as Draft
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </div>
      <Dialog open={isLocationPickerOpen} onOpenChange={setIsLocationPickerOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select Location on Map</DialogTitle>
            <DialogDescription>
              Drop a pin on the map to set where renters can find your item. You can drag the pin to fine-tune the
              position.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <LocationPickerMap value={mapSelectedCoords} onChange={setMapSelectedCoords} />
            <div className="text-sm text-muted-foreground">
              {mapSelectedCoords ? (
                <p>
                  Selected:&nbsp;
                  <span className="font-medium">Lat {mapSelectedCoords.lat.toFixed(6)}</span>,&nbsp;
                  <span className="font-medium">Lng {mapSelectedCoords.lng.toFixed(6)}</span>
                </p>
              ) : (
                <p>Tap anywhere on the map to drop a pin at your desired location.</p>
              )}
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setIsLocationPickerOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmMapLocation}
              disabled={!mapSelectedCoords || resolvingAddress}
            >
              {resolvingAddress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Use this Location"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request-First Dialog */}
      <Dialog open={showRequestFirstDialog} onOpenChange={setShowRequestFirstDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Request-First Item
            </DialogTitle>
            <DialogDescription className="pt-2 whitespace-pre-line">
              {getRequestFirstMessage()}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert className="border-primary/20 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertTitle className="text-sm font-semibold mb-1">How it works:</AlertTitle>
              <AlertDescription className="text-xs space-y-1">
                <p>• Your item won't appear in public listings</p>
                <p>• Nearby users can request this item</p>
                <p>• You'll be notified when there's demand in your city</p>
                <p>• You can then connect with interested renters</p>
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowRequestFirstDialog(false);
                handleInputChange("category", "");
                setSelectedCategoryType(null);
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleEnableRequests}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90"
            >
              Enable Requests for This Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PostItem;