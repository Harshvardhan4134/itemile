import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, LocateFixed, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const POPULAR_CITIES = [
  "Bengaluru",
  "Mumbai",
  "Delhi",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Lucknow",
  "Surat",
  "Indore",
  "Chandigarh",
  "Noida",
  "Gurugram",
  "Visakhapatnam",
  "Vizag",
  "Bhopal",
  "Coimbatore",
  "Kochi",
  "Thiruvananthapuram",
  "Nagpur",
  "Goa",
];

type CitySelectorDialogProps = {
  open: boolean;
  selectedCity: string | null;
  onOpenChange: (open: boolean) => void;
  onSelectCity: (city: string) => void;
};

export const CitySelectorDialog = ({
  open,
  selectedCity,
  onOpenChange,
  onSelectCity,
}: CitySelectorDialogProps) => {
  const [search, setSearch] = useState("");
  const [detecting, setDetecting] = useState(false);
  const { toast } = useToast();

  const filteredCities = useMemo(() => {
    if (!search.trim()) return POPULAR_CITIES;
    return POPULAR_CITIES.filter((city) =>
      city.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const handleUseLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        description: "Your browser does not support geolocation. Please select a city instead.",
        variant: "destructive",
      });
      return;
    }

    setDetecting(true);
    
    // Try with better options for more reliable location fetching
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Successfully got location
        onSelectCity("Current Location");
        toast({
          title: "Location enabled",
          description: "We'll use your current location to show nearby items.",
        });
        onOpenChange(false);
        setDetecting(false);
      },
      (error) => {
        setDetecting(false);
        
        let message = "Unable to fetch location. Please try again or choose a city.";
        let title = "Location unavailable";
        
        if (error.code === error.PERMISSION_DENIED) {
          title = "Location permission denied";
          message = "Please enable location access in your browser settings, or select a city manually.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          title = "Location unavailable";
          message = "Your location could not be determined. Please select a city from the list.";
        } else if (error.code === error.TIMEOUT) {
          title = "Location request timed out";
          message = "The location request took too long. Please try again or select a city.";
        }
        
        toast({
          title,
          description: message,
          variant: "destructive",
          duration: 6000,
        });
      },
      { 
        enableHighAccuracy: true, // Try to get GPS location
        timeout: 15000, // Increased timeout to 15 seconds
        maximumAge: 60000 // Accept location up to 1 minute old
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Choose your city
          </DialogTitle>
          <DialogDescription>
            Pick a city to personalize items near you. You can also use your
            current location if available.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && search.trim().length > 0) {
                  e.preventDefault();
                  onSelectCity(search.trim());
                  onOpenChange(false);
                  setSearch("");
                }
              }}
              placeholder="Search city or type any location"
            />
            <Button
              variant="outline"
              onClick={handleUseLocation}
              disabled={detecting}
              className="whitespace-nowrap"
            >
              {detecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <LocateFixed className="h-4 w-4 mr-2" />
                  Use my location
                </>
              )}
            </Button>
          </div>

          <ScrollArea className="h-64 rounded-md border">
            <div className="p-2 space-y-2">
              {/* Show custom location option if user has typed something */}
              {search.trim().length > 0 && (
                <div className="pb-2 border-b">
                  <Button
                    variant="default"
                    className="w-full justify-start bg-primary hover:bg-primary/90"
                    onClick={() => {
                      onSelectCity(search.trim());
                      onOpenChange(false);
                      setSearch("");
                    }}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Use "{search.trim()}"
                  </Button>
                </div>
              )}
              
              {/* Show filtered cities or popular cities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredCities.map((city) => (
                  <Button
                    key={city}
                    variant={selectedCity === city ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => {
                      onSelectCity(city);
                      onOpenChange(false);
                      setSearch("");
                    }}
                  >
                    {city}
                  </Button>
                ))}
                {filteredCities.length === 0 && search.trim().length === 0 && (
                  <div className="col-span-2 px-2 py-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Type a city name to search, or use your location.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex-row justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {selectedCity && (
            <div className="text-sm text-muted-foreground">
              Selected: <span className="font-medium">{selectedCity}</span>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


