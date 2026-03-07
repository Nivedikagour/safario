

## Plan: Fix Map Location & Add Authority Portal Statistics

### Two Changes Requested

---

### 1. Map: Show Actual Device Location

**Current behavior:** The Map page already uses `navigator.geolocation.getCurrentPosition` with `enableHighAccuracy: true`, which should return accurate device location. The issue is likely that:
- The browser's geolocation permission may be blocked or returning cached/approximate location
- Mapbox is working correctly — it just displays whatever coordinates the browser provides

**What I'll do:**
- Add `watchPosition` instead of `getCurrentPosition` so the map continuously tracks and updates the user's real location (more accurate over time)
- Add a visible "Refresh Location" button so users can manually re-request their position
- Display the current detected city name using Mapbox reverse geocoding, so users can confirm the map is showing the right place
- Keep the existing high-accuracy geolocation settings (`enableHighAccuracy: true, timeout: 10000, maximumAge: 0`)

No need for Google Maps API — the location accuracy issue is from the browser's geolocation API, not Mapbox. Mapbox just renders whatever coordinates it receives.

---

### 2. Authority Portal: Add Statistics Dashboard for FIR Reports & Lost Items

**What I'll add** to `AuthorityPortal.tsx`:

A statistics summary section at the top of both the **FIR Reports** and **Lost Items** tabs showing:

**FIR Reports stats:**
- Total reports filed
- Filed (pending) count
- Under investigation count  
- Closed count
- Reports filed in last 7 days

**Lost Items stats:**
- Total items reported
- Currently lost count
- Found/recovered count
- Items reported in last 7 days

Each stat will be displayed as a card with an icon, count, and label. The data is already fetched — I'll just compute aggregations from the existing `firReports` and `lostItems` state arrays. No new database queries needed.

---

### Files to modify:
1. **`src/pages/Map.tsx`** — Add `watchPosition`, refresh button, city name display
2. **`src/components/dashboard/MapComponent.tsx`** — Accept updated location prop smoothly  
3. **`src/pages/AuthorityPortal.tsx`** — Add statistics cards to FIR and Lost Items tabs

