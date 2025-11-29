import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroBackground from "@/assets/hero-background.jpg";
import thailandBeach from "@/assets/thailand-beach.jpg";
import switzerlandAlps from "@/assets/switzerland-alps.jpg";
import santoriniGreece from "@/assets/santorini-greece.jpg";
import baliTemple from "@/assets/bali-temple.jpg";

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
              <div className="group relative overflow-hidden rounded-lg border border-border hover:border-primary transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-lg">
                <img 
                  src={thailandBeach} 
                  alt="Beautiful beaches of Thailand" 
                  className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-6 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-xl font-bold text-foreground mb-2">Thailand</h3>
                  <p className="text-sm text-muted-foreground">Tropical paradise with pristine beaches</p>
                </div>
              </div>
              
              <div className="group relative overflow-hidden rounded-lg border border-border hover:border-primary transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-lg">
                <img 
                  src={switzerlandAlps} 
                  alt="Swiss Alps mountains" 
                  className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-6 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-xl font-bold text-foreground mb-2">Switzerland</h3>
                  <p className="text-sm text-muted-foreground">Majestic Alps and alpine beauty</p>
                </div>
              </div>
              
              <div className="group relative overflow-hidden rounded-lg border border-border hover:border-primary transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-lg">
                <img 
                  src={santoriniGreece} 
                  alt="Santorini Greece sunset" 
                  className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-6 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-xl font-bold text-foreground mb-2">Santorini</h3>
                  <p className="text-sm text-muted-foreground">Iconic white buildings and blue seas</p>
                </div>
              </div>
              
              <div className="group relative overflow-hidden rounded-lg border border-border hover:border-primary transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-lg">
                <img 
                  src={baliTemple} 
                  alt="Bali temple and nature" 
                  className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-6 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-xl font-bold text-foreground mb-2">Bali</h3>
                  <p className="text-sm text-muted-foreground">Mystical temples and lush jungles</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
