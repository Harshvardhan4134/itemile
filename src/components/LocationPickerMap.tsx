import { useEffect, useRef, useState } from "react";
import { Wrapper, Status } from "@googlemaps/react-wrapper";
import { MapPin } from "lucide-react";

interface LocationPickerMapProps {
  value?: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number }) => void;
}

interface MapComponentProps extends LocationPickerMapProps {
  apiKey: string;
}

const DEFAULT_CENTER: google.maps.LatLngLiteral = {
  lat: 28.6139,
  lng: 77.209,
};

const MapComponent: React.FC<MapComponentProps> = ({ value, onChange }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map>();
  const markerRef = useRef<google.maps.Marker>();
  const [currentValue, setCurrentValue] = useState<{ lat: number; lng: number } | null>(value || null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: currentValue || DEFAULT_CENTER,
      zoom: currentValue ? 15 : 5,
      disableDefaultUI: true,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      gestureHandling: "greedy",
    });

    mapInstanceRef.current.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      const coords = { lat: event.latLng.lat(), lng: event.latLng.lng() };
      setMarker(coords);
      setCurrentValue(coords);
      onChange(coords);
    });
  }, [onChange]);

  useEffect(() => {
    if (value) {
      setMarker(value);
      setCurrentValue(value);
      mapInstanceRef.current?.panTo(value);
      if ((mapInstanceRef.current?.getZoom() || 0) < 12) {
        mapInstanceRef.current?.setZoom(12);
      }
    }
  }, [value]);

  const setMarker = (coords: { lat: number; lng: number }) => {
    if (!mapInstanceRef.current) return;

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        map: mapInstanceRef.current,
        position: coords,
        draggable: true,
        icon: {
          url:
            "data:image/svg+xml;charset=UTF-8," +
            encodeURIComponent(`
              <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" fill="#2563eb" stroke="#ffffff" stroke-width="2"/>
                <path d="M20 10c-4 0-7 3.1-7 7 0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S18.6 14.5 20 14.5s2.5 1.1 2.5 2.5S21.4 19.5 20 19.5z" fill="#ffffff"/>
              </svg>
            `),
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 40),
        },
      });

      markerRef.current.addListener("dragend", () => {
        const position = markerRef.current?.getPosition();
        if (!position) return;
        const coords = { lat: position.lat(), lng: position.lng() };
        setCurrentValue(coords);
        onChange(coords);
      });
    } else {
      markerRef.current.setPosition(coords);
    }
  };

  return <div ref={mapRef} className="h-[400px] w-full rounded-xl overflow-hidden" />;
};

const renderStatus = (status: Status) => {
  switch (status) {
    case Status.LOADING:
      return (
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </div>
      );
    case Status.FAILURE:
      return (
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Failed to load map</p>
          </div>
        </div>
      );
    default:
      return null;
  }
};

const LocationPickerMap: React.FC<LocationPickerMapProps> = ({ value, onChange }) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Google Maps API key is not configured.</p>
        </div>
      </div>
    );
  }

  return (
    <Wrapper apiKey={apiKey} render={renderStatus}>
      <MapComponent apiKey={apiKey} value={value} onChange={onChange} />
    </Wrapper>
  );
};

export default LocationPickerMap;
