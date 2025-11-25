import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, MapPin, AlertTriangle, FileText } from "lucide-react";
import heroBackground from "@/assets/hero-background.jpg";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <div 
        className="relative min-h-screen bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background/90 backdrop-blur-sm" />
        
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-6xl md:text-7xl font-bold mb-6 text-foreground">
              Safario
            </h1>
            <p className="text-2xl md:text-3xl mb-4 text-foreground/90">
              Your Travel Safety Companion
            </p>
            <p className="text-lg md:text-xl mb-12 text-muted-foreground max-w-2xl mx-auto">
              Stay protected with real-time safety scores, emergency alerts, location tracking, and AI assistance during your travels
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button size="lg" className="text-lg px-8" onClick={() => navigate("/auth")}>
                Get Started
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
              <div className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border border-border">
                <Shield className="h-12 w-12 text-primary mb-4 mx-auto" />
                <h3 className="text-lg font-semibold mb-2">Safety Score</h3>
                <p className="text-sm text-muted-foreground">Real-time area safety assessment based on crime and weather data</p>
              </div>
              
              <div className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border border-border">
                <MapPin className="h-12 w-12 text-primary mb-4 mx-auto" />
                <h3 className="text-lg font-semibold mb-2">Location Tracking</h3>
                <p className="text-sm text-muted-foreground">Automatic geofencing and danger zone detection</p>
              </div>
              
              <div className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border border-border">
                <AlertTriangle className="h-12 w-12 text-primary mb-4 mx-auto" />
                <h3 className="text-lg font-semibold mb-2">Emergency Alerts</h3>
                <p className="text-sm text-muted-foreground">Instant alerts to authorities with your location</p>
              </div>
              
              <div className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border border-border">
                <FileText className="h-12 w-12 text-primary mb-4 mx-auto" />
                <h3 className="text-lg font-semibold mb-2">Lost & Found</h3>
                <p className="text-sm text-muted-foreground">Report and track lost items with digital e-FIR</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
