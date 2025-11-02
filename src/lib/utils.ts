import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Reverse geocoding utility to convert coordinates to city name
export async function getCityNameFromCoordinates(latitude: number, longitude: number): Promise<string> {
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  console.log('Reverse geocoding for:', latitude, longitude);
  console.log('API Key available:', !!GOOGLE_MAPS_API_KEY);
  
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not found, falling back to coordinates');
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}&result_type=locality|administrative_area_level_2|administrative_area_level_1|country`;
    console.log('Geocoding URL:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('Geocoding response:', data);
    
    if (data.status === 'OK' && data.results.length > 0) {
      // Try to find the most specific location name
      const result = data.results[0];
      
      // Look for city/locality first, then administrative area
      const addressComponents = result.address_components;
      let cityName = '';
      
      // Priority order: locality > administrative_area_level_2 > administrative_area_level_1
      for (const component of addressComponents) {
        if (component.types.includes('locality')) {
          cityName = component.long_name;
          break;
        } else if (component.types.includes('administrative_area_level_2') && !cityName) {
          cityName = component.long_name;
        } else if (component.types.includes('administrative_area_level_1') && !cityName) {
          cityName = component.long_name;
        }
      }
      
      const resultName = cityName || result.formatted_address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      console.log('Geocoding result:', resultName);
      return resultName;
    } else if (data.status === 'ZERO_RESULTS') {
      console.warn('No results found for coordinates:', latitude, longitude);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } else if (data.status === 'OVER_QUERY_LIMIT') {
      console.warn('Google Maps API quota exceeded');
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } else if (data.status === 'REQUEST_DENIED') {
      // Handle API key restriction errors gracefully
      if (data.error_message && data.error_message.includes('referer restrictions')) {
        console.warn('Google Maps API key has referer restrictions - using coordinates instead');
      } else {
        console.error('Google Maps API request denied:', data.error_message);
      }
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } else {
      console.error('Geocoding failed with status:', data.status, data.error_message);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    // Fallback to coordinates on error
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }
}