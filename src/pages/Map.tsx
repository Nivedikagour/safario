import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MapComponent from "@/components/dashboard/MapComponent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Navigation, RefreshCw, MapPin, Search, ExternalLink, Map as MapIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NearbyPlace {
  name: string;
  type: string;
  lat: number;
  lng: number;
  distance: string;
}

const Map = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const destination = searchParams.get("destination");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      startWatchingLocation();
    };
    checkAuth();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [navigate]);

  // Reverse geocode + fetch nearby places when location changes
  useEffect(() => {
    if (!location) return;
    reverseGeocode();
    fetchNearbyPlaces();
  }, [location]);

  const reverseGeocode = async () => {
    if (!location) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=10&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const geo = await res.json();
      if (geo.display_name) {
        const city = geo.address?.city || geo.address?.town || geo.address?.village || geo.address?.state_district;
        const state = geo.address?.state;
        setCityName(city && state ? `${city}, ${state}` : geo.display_name);
      }
    } catch (err) {
      console.error("Reverse geocode failed:", err);
    }
  };

  const fetchNearbyPlaces = async () => {
    if (!location) return;
    setLoadingPlaces(true);
    try {
      // Overpass API query for nearby tourism/amenity places within 3km
      const query = `
        [out:json][timeout:10];
        (
          node["tourism"~"attraction|museum|viewpoint|artwork|gallery"](around:3000,${location.lat},${location.lng});
          node["amenity"~"restaurant|cafe|hospital|pharmacy|police"](around:3000,${location.lat},${location.lng});
          node["historic"](around:3000,${location.lat},${location.lng});
        );
        out body 20;
      `;
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const data = await res.json();
      
      const places: NearbyPlace[] = (data.elements || [])
        .filter((el: any) => el.tags?.name)
        .map((el: any) => {
          const dist = getDistance(location.lat, location.lng, el.lat, el.lon);
          return {
            name: el.tags.name,
            type: el.tags.tourism || el.tags.amenity || el.tags.historic || 'place',
            lat: el.lat,
            lng: el.lon,
            distance: dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`,
          };
        })
        .sort((a: NearbyPlace, b: NearbyPlace) => parseFloat(a.distance) - parseFloat(b.distance));

      setNearbyPlaces(places);
    } catch (err) {
      console.error("Failed to fetch nearby places:", err);
    } finally {
      setLoadingPlaces(false);
    }
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const startWatchingLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Location Error", description: "Geolocation is not supported. Use search.", variant: "destructive" });
      return;
    }
    setLocating(true);
    setManualMode(false);
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast({ title: "Location Inaccurate?", description: "Use the search box to set your exact location." });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const results = await res.json();
      if (results.length > 0) {
        const result = results[0];
        if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
        setManualMode(true);
        setLocation({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
        const city = result.address?.city || result.address?.town || result.address?.village || result.address?.state_district;
        const state = result.address?.state;
        setCityName(city && state ? `${city}, ${state}` : result.display_name);
        toast({ title: "Location Set", description: `Map centered on ${city || result.display_name}` });
      } else {
        toast({ title: "Not Found", description: "Could not find that location.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Search Error", description: "Failed to search location.", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const handleRefreshLocation = () => {
    setCityName(null);
    setLocation(null);
    setSearchQuery("");
    setNearbyPlaces([]);
    startWatchingLocation();
    toast({ title: "Refreshing Location", description: "Getting your current position..." });
  };

  const getGoogleMapsUrl = (place: NearbyPlace) => {
    return `https://www.google.com/maps/dir/?api=1&origin=${location?.lat},${location?.lng}&destination=${place.lat},${place.lng}`;
  };

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="hover:bg-accent shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">
                {destination ? `Directions to ${destination}` : "Location & Geofencing"}
              </h1>
              {destination && (
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Navigation className="h-3 w-3" /> Showing route
                </p>
              )}
              {cityName && !destination && (
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" /> {cityName}
                  {manualMode && <span className="ml-1 text-xs">(manual)</span>}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefreshLocation} disabled={locating} className="text-xs sm:text-sm">
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 ${locating ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{locating ? "Locating..." : "Use Device Location"}</span>
              <span className="sm:hidden">{locating ? "..." : "Device"}</span>
            </Button>
            {destination && (
              <Button variant="outline" size="sm" onClick={() => navigate("/map")} className="text-xs sm:text-sm">
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-3 sm:mb-4">
          <Input
            placeholder="Search city or area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchLocation()}
            className="max-w-full sm:max-w-md text-sm"
          />
          <Button onClick={handleSearchLocation} disabled={searching || !searchQuery.trim()} size="sm" className="shrink-0">
            <Search className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">{searching ? "..." : "Search"}</span>
          </Button>
        </div>

        {/* Map + Nearby Places */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="lg:col-span-2 bg-card border border-border rounded-lg p-2 sm:p-4 md:p-6">
            <MapComponent location={location} destination={destination} />
          </div>

          {/* Nearby Places Sidebar */}
          <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
            <h3 className="text-base sm:text-lg font-semibold mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Nearby Places
            </h3>
            {loadingPlaces ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-16 rounded-lg bg-accent/10 animate-pulse" />
                ))}
              </div>
            ) : nearbyPlaces.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {location ? "No nearby places found. Try a different area." : "Set your location to see nearby places."}
              </p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {nearbyPlaces.map((place, idx) => (
                  <Card key={idx} className="p-3 bg-accent/5 hover:bg-accent/10 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{place.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground capitalize">{place.type}</span>
                          <span className="text-xs font-medium text-primary">{place.distance}</span>
                        </div>
                      </div>
                      <a
                        href={getGoogleMapsUrl(place)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 p-1.5 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors"
                        title="Get directions"
                      >
                        <Navigation className="h-3.5 w-3.5 text-primary" />
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map;
