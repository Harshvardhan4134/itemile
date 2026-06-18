import React, { useEffect, useRef, useState } from 'react';
import { formatCurrency } from "@/lib/format";
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Star, DollarSign } from 'lucide-react';
import { Listing } from '@/lib/firestore';

interface MapProps {
  listings: Listing[];
  onListingSelect?: (listing: Listing) => void;
  center?: google.maps.LatLngLiteral;
  zoom?: number;
}

interface MapComponentProps extends MapProps {
  apiKey: string;
}

const MapComponent: React.FC<MapComponentProps> = ({ 
  listings, 
  onListingSelect, 
  center = { lat: 37.7749, lng: -122.4194 }, 
  zoom = 12 
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow>();

  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new window.google.maps.Map(ref.current, {
        center,
        zoom,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });
      setMap(newMap);
      setInfoWindow(new window.google.maps.InfoWindow());
    }
  }, [ref, map, center, zoom]);

  useEffect(() => {
    if (map && infoWindow) {
      // Clear existing markers
      markers.forEach(marker => marker.setMap(null));
      const newMarkers: google.maps.Marker[] = [];

      listings.forEach((listing) => {
        if (listing.location) {
          const marker = new google.maps.Marker({
            position: {
              lat: listing.location.latitude,
              lng: listing.location.longitude
            },
            map,
            title: listing.title,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="18" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
                  <path d="M20 8l-4 12h8l-4-12z" fill="#ffffff"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 20)
            }
          });

          marker.addListener('click', () => {
            const content = `
              <div style="padding: 8px; min-width: 200px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <img src="${listing.images[0] || '/placeholder.svg'}" 
                       style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" 
                       alt="${listing.title}" />
                  <div>
                    <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937;">${listing.title}</h3>
                    <div style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
                      <span style="color: #3b82f6; font-weight: 600; font-size: 16px;">${formatCurrency(listing.rentPerDay)}</span>
                      <span style="color: #6b7280; font-size: 12px;">/day</span>
                    </div>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 8px;">
                  <span style="background: #f3f4f6; color: #374151; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${listing.category}</span>
                  ${listing.swapAllowed ? '<span style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-size: 10px;">SWAP</span>' : ''}
                </div>
                <button onclick="window.viewListingDetails('${listing.id}')" 
                        style="width: 100%; background: #3b82f6; color: white; border: none; padding: 8px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                  View Details
                </button>
              </div>
            `;
            
            infoWindow.setContent(content);
            infoWindow.open(map, marker);
            
            // Add global function for button click
            (window as any).viewListingDetails = (listingId: string) => {
              window.location.href = `/item/${listingId}`;
            };
          });

          newMarkers.push(marker);
        }
      });

      setMarkers(newMarkers);
    }
  }, [map, infoWindow, listings, onListingSelect]);

  return <div ref={ref} style={{ height: '100%', width: '100%' }} />;
};

const render = (status: Status) => {
  switch (status) {
    case Status.LOADING:
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </div>
      );
    case Status.FAILURE:
      return (
        <div className="flex items-center justify-center h-full">
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

const GoogleMap: React.FC<MapProps> = (props) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === "your_google_maps_api_key_here") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground mb-2">Google Maps API key not configured</p>
          <p className="text-sm text-muted-foreground">
            Please add your Google Maps API key to the .env file
          </p>
        </div>
      </div>
    );
  }

  return (
    <Wrapper apiKey={apiKey} render={render}>
      <MapComponent {...props} apiKey={apiKey} />
    </Wrapper>
  );
};

export default GoogleMap;
