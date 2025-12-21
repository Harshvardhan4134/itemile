// Category-based listing rules for the rental marketplace

// Direct Listing Categories - Can be publicly listed on Explore page
export const DIRECT_LISTING_CATEGORIES = [
  "Sports & Outdoor",
  "Fitness",
  "Tools",
  "Furniture",
  "Travel",
  "Kitchen",
  "Home & Utility",
  "Books",
  "Clothing"
] as const;

// Request-First Categories - Allowed but only through request-based discovery
export const REQUEST_FIRST_CATEGORIES = [
  "Photography",
  "Bikes & Scooters",
  "Vehicles",
  "Cars",
  "Music",
  "Professional Equipment",
  "Drones"
] as const;

// Restricted Categories - Not allowed due to fraud and safety concerns
export const RESTRICTED_CATEGORIES = [
  "Mobile Phones / Smartphones",
  "Laptops / Tablets / Computers",
  "High-End Electronics",
  "Gaming / Gaming Consoles",
  "Smartwatches / Wearables",
  "Expensive Gadgets",
  "Electronics"
] as const;

/**
 * Check if a category is restricted
 */
export function isCategoryRestricted(category: string): boolean {
  return RESTRICTED_CATEGORIES.some(
    restricted => restricted.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Check if a category is request-first only
 */
export function isRequestFirstAllowed(category: string): boolean {
  return REQUEST_FIRST_CATEGORIES.some(
    requestFirst => requestFirst.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Check if a category allows direct listing
 */
export function isDirectListingAllowed(category: string): boolean {
  return DIRECT_LISTING_CATEGORIES.some(
    direct => direct.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Get the listing type for a category
 */
export function getCategoryListingType(category: string): 'direct' | 'request-only' | 'restricted' {
  if (isCategoryRestricted(category)) {
    return 'restricted';
  }
  if (isRequestFirstAllowed(category)) {
    return 'request-only';
  }
  return 'direct';
}

/**
 * Get user-friendly message for restricted categories
 */
export function getRestrictedMessage(category: string): string {
  return `The category "${category}" is restricted due to fraud and safety concerns. Please choose a different category.`;
}

/**
 * Get user-friendly message for request-first categories
 */
export function getRequestFirstMessage(category: string): string {
  return `Items in the "${category}" category are not publicly listed on the Explore page. Instead, users can request items in this category, and you'll be notified when there's demand in your city.`;
}

/**
 * Get all allowed direct listing categories
 */
export function getAllowedDirectListingCategories(): string[] {
  return [...DIRECT_LISTING_CATEGORIES];
}

/**
 * Get all allowed request-first categories
 */
export function getAllowedRequestFirstCategories(): string[] {
  return [...REQUEST_FIRST_CATEGORIES];
}
