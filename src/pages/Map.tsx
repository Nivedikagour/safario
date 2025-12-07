import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MapComponent from "@/components/dashboard/MapComponent";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Map = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const destination = searchParams.get("destination");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      requestLocation();
    };
    checkAuth();
  }, [navigate]);

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Location Error",
            description: "Unable to get your location. Please enable location services.",
            variant: "destructive",
          });
        }
      );
    }
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
            </div>
          </div>
          {destination && (
            <Button 
              variant="outline" 
              onClick={() => navigate("/map")}
            >
              Clear Destination
            </Button>
          )}
        </div>
        
        <div className="bg-card border border-border rounded-lg p-6">
          <MapComponent location={location} destination={destination} />
        </div>
      </div>
    </div>
  );
};

export default Map;
