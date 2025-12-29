# Category-Based Listing Rules Implementation

This document describes the implementation of category-based listing controls for the peer-to-peer rental marketplace.

## Overview

The platform now supports three types of category classifications:

1. **Direct Listing** - Items can be publicly listed on the Explore page (city-scoped)
2. **Request-First** - Items are allowed but only through request-based discovery (not publicly listed)
3. **Restricted** - Items are not allowed for listing or requests due to fraud and safety concerns

## Implementation Details

### 1. Category Classification System (`src/lib/categoryRules.ts`)

A centralized utility module that defines:
- Category lists for each classification type
- Helper functions to check category types
- User-friendly messages for different scenarios

#### Direct Listing Categories
- Sports & Outdoor
- Fitness
- Tools
- Furniture
- Travel
- Kitchen
- Home & Utility
- Books
- Clothing

#### Request-First Categories
- Photography (cameras)
- Bikes & Scooters
- Vehicles
- Cars
- Music (audio gear, lighting kits)
- Professional Equipment
- Drones

#### Restricted Categories
- Mobile Phones / Smartphones
- Laptops / Tablets / Computers
- High-End Electronics
- Gaming / Gaming Consoles
- Smartwatches / Wearables
- Expensive Gadgets
- Electronics (generic - restricted by default for safety)

### 2. Listing Interface Updates (`src/lib/firestore.ts`)

Added two new optional fields to the `Listing` interface:
- `listingType?: 'direct' | 'request-only'` - Indicates the type of listing
- `requestEnabled?: boolean` - For request-first items, whether owner has enabled requests

### 3. Post Item Page (`src/pages/PostItem.tsx`)

**Features:**
- Category selection automatically checks restrictions
- Shows appropriate dialogs for request-first items
- Blocks restricted categories with error messages
- Request-first dialog with "Enable Requests for This Item" CTA
- Validates category before submission
- Sets `listingType` and `requestEnabled` fields when creating listings

**User Flow:**
1. User selects a category
2. If restricted → Error message, category cleared
3. If request-first → Dialog appears explaining the system
4. User clicks "Enable Requests for This Item" → Requests enabled
5. Listing created with appropriate `listingType` field

### 4. Explore Page (`src/pages/Explore.tsx`)

**Features:**
- Filters out request-first items (`listingType === 'request-only'`) from public listings
- Only shows direct listing items on the Explore page
- Maintains city-based filtering (existing functionality)
- Backward compatible with listings that don't have `listingType` set

### 5. Post Request Page (`src/pages/PostRequest.tsx`)

**Features:**
- Filters out restricted categories from category dropdown
- Validates category selection before submission
- Shows error message if restricted category is selected
- Allows both direct listing and request-first categories for requests

## User Experience

### Direct Listing Items
- Appear publicly on Explore page
- Visible only within the same city (existing city filtering)
- Standard listing flow

### Request-First Items
- **When listing:** User sees dialog explaining request-first system
- **After enabling:** Item is stored but not shown on Explore page
- **Discovery:** Nearby users can request the item through the request system
- **Notification:** Owner is notified when there's demand in their city

### Restricted Items
- **When listing:** Error message shown, category selection blocked
- **When requesting:** Category not available in dropdown, submission blocked
- **Message:** Clear explanation about fraud risk and safety concerns

## Technical Notes

1. **Backward Compatibility:** Listings without `listingType` are treated as direct listings for backward compatibility.

2. **City-Based Filtering:** The existing city-based filtering system continues to work. Items are only visible within the same city.

3. **Category Validation:** Validation happens at multiple levels:
   - UI level (category dropdown filtering)
   - Selection level (immediate feedback)
   - Submission level (final validation before save)

4. **Request System Integration:** Request-first items integrate with the existing request system. When users post requests for these categories, owners with matching items (who have enabled requests) can be notified.

## Future Enhancements

Potential improvements:
- Admin panel controls to modify category rules
- Analytics on request-first vs direct listing performance
- Notification system for request-first item owners
- Category subcategories for more granular control











