import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MapComponent from "@/components/dashboard/MapComponent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Navigation, RefreshCw, MapPin, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  // Reverse geocode to get city name using OpenStreetMap Nominatim
  useEffect(() => {
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
    reverseGeocode();
  }, [location]);

  const startWatchingLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location Error",
        description: "Geolocation is not supported by your browser. Use the search box to set your location manually.",
        variant: "destructive",
      });
      return;
    }

    setLocating(true);
    setManualMode(false);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocating(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        setLocating(false);
        toast({
          title: "Location Inaccurate?",
          description: "Browser location may be approximate on laptops. Use the search box below to set your exact location.",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
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
        // Stop watching browser location
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        setManualMode(true);
        setLocation({
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
        });
        const city = result.address?.city || result.address?.town || result.address?.village || result.address?.state_district;
        const state = result.address?.state;
        setCityName(city && state ? `${city}, ${state}` : result.display_name);
        toast({
          title: "Location Set",
          description: `Map centered on ${city || result.display_name}`,
        });
      } else {
        toast({
          title: "Not Found",
          description: "Could not find that location. Try a different search.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Search failed:", err);
      toast({
        title: "Search Error",
        description: "Failed to search location. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleRefreshLocation = () => {
    setCityName(null);
    setLocation(null);
    setSearchQuery("");
    startWatchingLocation();
    toast({
      title: "Refreshing Location",
      description: "Getting your current position...",
    });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="hover:bg-accent"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {destination ? `Directions to ${destination}` : "Location & Geofencing"}
              </h1>
              {destination && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Navigation className="h-3 w-3" />
                  Showing route from your location
                </p>
              )}
              {cityName && !destination && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {cityName}
                  {manualMode && <span className="ml-1 text-xs">(manual)</span>}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshLocation}
              disabled={locating}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${locating ? "animate-spin" : ""}`} />
              {locating ? "Locating..." : "Use Device Location"}
            </Button>
            {destination && (
              <Button
                variant="outline"
                onClick={() => navigate("/map")}
              >
                Clear Destination
              </Button>
            )}
          </div>
        </div>

        {/* Manual location search */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Search your city or area (e.g. Indore, Magardha)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchLocation()}
            className="max-w-md"
          />
          <Button
            onClick={handleSearchLocation}
            disabled={searching || !searchQuery.trim()}
            size="sm"
          >
            <Search className="h-4 w-4 mr-1" />
            {searching ? "Searching..." : "Set Location"}
          </Button>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <MapComponent location={location} destination={destination} />
        </div>
      </div>
    </div>
  );
};

export default Map;
