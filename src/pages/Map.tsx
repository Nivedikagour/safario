import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MapComponent from "@/components/dashboard/MapComponent";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Navigation, RefreshCw, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Map = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
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

  // Reverse geocode to get city name when location changes
  useEffect(() => {
    const reverseGeocode = async () => {
      if (!location) return;
      try {
        const { data } = await supabase.functions.invoke('mapbox-token');
        if (!data?.token) return;
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.lng},${location.lat}.json?types=place&access_token=${data.token}`
        );
        const geo = await res.json();
        if (geo.features?.length > 0) {
          setCityName(geo.features[0].place_name);
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
        description: "Geolocation is not supported by your browser.",
        variant: "destructive",
      });
      return;
    }

    setLocating(true);

    // Clear any existing watch
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
          title: "Location Error",
          description: "Unable to get your location. Please enable location services.",
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleRefreshLocation = () => {
    setCityName(null);
    setLocation(null);
    startWatchingLocation();
    toast({
      title: "Refreshing Location",
      description: "Getting your current position...",
    });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
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
              {locating ? "Locating..." : "Refresh Location"}
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

        <div className="bg-card border border-border rounded-lg p-6">
          <MapComponent location={location} destination={destination} />
        </div>
      </div>
    </div>
  );
};

export default Map;
