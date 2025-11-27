import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertTriangle, FileText, Shield, CreditCard, MapPin } from "lucide-react";
import SafetyScore from "@/components/dashboard/SafetyScore";
import WeatherWidget from "@/components/dashboard/WeatherWidget";
import AlertButton from "@/components/dashboard/AlertButton";
import ChatBot from "@/components/dashboard/ChatBot";
import DigitalIDCard from "@/components/dashboard/DigitalIDCard";
import MapComponent from "@/components/dashboard/MapComponent";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchProfile(session.user.id);
        requestLocation();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) {
      navigate("/id-generation");
    } else {
      setProfile(data);
    }
  };

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
          toast.error("Please enable location access for full safety features");
        }
      );
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-foreground">Safario</h1>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => navigate("/id-card")}>
                <CreditCard className="mr-2 h-4 w-4" />
                View ID
              </Button>
              <Button variant="outline" onClick={() => navigate("/lost-found")}>
                <FileText className="mr-2 h-4 w-4" />
                Lost & Found
              </Button>
              <Button variant="ghost" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {profile?.full_name}!
          </h2>
          <p className="text-muted-foreground">Stay safe on your journey</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SafetyScore location={location} />
          <WeatherWidget location={location} />
          
          <Card className="p-6 border-primary/20 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Your Location</h3>
                <p className="text-sm text-muted-foreground">Real-time tracking</p>
              </div>
            </div>
            {location ? (
              <div className="text-sm space-y-1">
                <p>Latitude: {location.lat.toFixed(4)}</p>
                <p>Longitude: {location.lng.toFixed(4)}</p>
                <p className="text-xs text-muted-foreground mt-2">Location updated automatically</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Requesting location...</p>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6 bg-card/50 backdrop-blur-sm">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Safety Features
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg">
                <span className="text-sm">Geofencing Active</span>
                <span className="text-xs text-green-500 font-semibold">Enabled</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg">
                <span className="text-sm">Real-time Crime Alerts</span>
                <span className="text-xs text-green-500 font-semibold">Active</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg">
                <span className="text-sm">Weather Monitoring</span>
                <span className="text-xs text-green-500 font-semibold">On</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-destructive/5 backdrop-blur-sm border-destructive/20">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Emergency Alert
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              In case of emergency, use the button below to immediately alert authorities with your location.
            </p>
            <AlertButton location={location} userId={user?.id} />
          </Card>
        </div>

        <Card className="p-6 bg-card/50 backdrop-blur-sm">
          <h3 className="text-xl font-semibold mb-4">Interactive Safety Map</h3>
          <MapComponent location={location} />
        </Card>
      </main>

      <ChatBot />
    </div>
  );
};

export default Dashboard;