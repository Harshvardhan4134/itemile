/** Itemile brand and locale constants (US marketplace). */

export const APP_NAME = "Itemile";
export const APP_TAGLINE = "Rent what you need. Share what you have.";
export const SUPPORT_EMAIL = "support@itemile.com";
export const NOREPLY_EMAIL = "noreply@itemile.com";
export const APP_URL =
  import.meta.env.VITE_APP_URL?.replace(/\/$/, "") || "https://itemile.com";

export const STORAGE_KEYS = {
  selectedCity: "itemile_selected_city",
  cityChangedEvent: "itemile-city-changed",
  locationPermissionRequested: (uid: string) =>
    `itemile_location_permission_requested_${uid}`,
  termsAccepted: (version: string, uid?: string | null) =>
    `itemile_terms_${version}_${uid ?? "anonymous"}`,
} as const;

export const US_POPULAR_CITIES = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Houston",
  "Phoenix",
  "Philadelphia",
  "San Antonio",
  "San Diego",
  "Dallas",
  "San Jose",
  "Austin",
  "Jacksonville",
  "San Francisco",
  "Seattle",
  "Denver",
  "Boston",
  "Miami",
  "Atlanta",
  "Minneapolis",
  "Portland",
] as const;

/** Lowercase city name → coordinates for Explore location filter (~100 km radius). */
export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "new york": { lat: 40.7128, lng: -74.006 },
  "los angeles": { lat: 34.0522, lng: -118.2437 },
  chicago: { lat: 41.8781, lng: -87.6298 },
  houston: { lat: 29.7604, lng: -95.3698 },
  phoenix: { lat: 33.4484, lng: -112.074 },
  philadelphia: { lat: 39.9526, lng: -75.1652 },
  "san antonio": { lat: 29.4241, lng: -98.4936 },
  "san diego": { lat: 32.7157, lng: -117.1611 },
  dallas: { lat: 32.7767, lng: -96.797 },
  "san jose": { lat: 37.3382, lng: -121.8863 },
  austin: { lat: 30.2672, lng: -97.7431 },
  jacksonville: { lat: 30.3322, lng: -81.6557 },
  "san francisco": { lat: 37.7749, lng: -122.4194 },
  seattle: { lat: 47.6062, lng: -122.3321 },
  denver: { lat: 39.7392, lng: -104.9903 },
  boston: { lat: 42.3601, lng: -71.0589 },
  miami: { lat: 25.7617, lng: -80.1918 },
  atlanta: { lat: 33.749, lng: -84.388 },
  minneapolis: { lat: 44.9778, lng: -93.265 },
  portland: { lat: 45.5152, lng: -122.6784 },
};

/** US geographic center — fallback map position before city/GPS is set. */
export const DEFAULT_MAP_CENTER = { lat: 39.8283, lng: -98.5795 };

export const CLOUDINARY_FOLDERS = {
  listings: "itemile/listings",
  videos: "itemile/videos",
  profilePhotos: "itemile/profile-photos",
  kyc: "itemile/kyc",
  chat: "itemile/chat",
  handoverMedia: "itemile/handoverMedia",
} as const;

/** US phone: 10 digits, optional punctuation. */
export const US_PHONE_DIGITS_REGEX = /^\d{10}$/;

export function normalizeUSPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return input.trim();
}

export function formatUSPhoneDisplay(input: string): string {
  const digits = input.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return input;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** US marketplace pricing thresholds (USD) */
export const US_MARKET = {
  highValueItemUsd: 5000,
  minDepositUsd: 25,
  microDepositUsd: 5,
  depositRate: 0.1,
  serviceFeeRate: 0.05,
} as const;
