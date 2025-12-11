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
        description: "Your browser does not support geolocation.",
        variant: "destructive",
      });
      return;
    }

    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        // We don't reverse-geocode; we just mark that the user opted-in.
        onSelectCity("Current Location");
        toast({
          title: "Location enabled",
          description: "We'll use your current location to show nearby items.",
        });
        onOpenChange(false);
        setDetecting(false);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Permission denied. Please enable location in your browser settings."
            : "Unable to fetch location. Please try again or choose a city.";
        toast({
          title: "Location unavailable",
          description: message,
          variant: "destructive",
        });
        setDetecting(false);
      },
      { timeout: 8000 }
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
              placeholder="Search city"
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
            <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredCities.map((city) => (
                <Button
                  key={city}
                  variant={selectedCity === city ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => {
                    onSelectCity(city);
                    onOpenChange(false);
                  }}
                >
                  {city}
                </Button>
              ))}
              {filteredCities.length === 0 && (
                <p className="text-sm text-muted-foreground px-2">
                  No cities found. Try another name.
                </p>
              )}
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


