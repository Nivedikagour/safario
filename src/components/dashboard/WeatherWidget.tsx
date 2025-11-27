import { Card } from "@/components/ui/card";
import { Cloud, CloudRain, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WeatherWidgetProps {
  location: { lat: number; lng: number } | null;
}

const WeatherWidget = ({ location }: WeatherWidgetProps) => {
  const [weather, setWeather] = useState({
    temp: 24,
    condition: "Sunny",
    humidity: 65,
    description: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location) {
      fetchWeather();
    }
  }, [location]);

  const fetchWeather = async () => {
    if (!location) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('weather', {
        body: { lat: location.lat, lng: location.lng },
      });

      if (error) throw error;

      if (data) {
        setWeather({
          temp: data.temp,
          condition: data.condition,
          humidity: data.humidity,
          description: data.description,
        });
      }
    } catch (error) {
      console.error('Weather fetch error:', error);
      toast.error('Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = () => {
    switch (weather.condition) {
      case "Sunny":
        return <Sun className="h-6 w-6 text-yellow-500" />;
      case "Rainy":
        return <CloudRain className="h-6 w-6 text-blue-500" />;
      default:
        return <Cloud className="h-6 w-6 text-gray-500" />;
    }
  };

  return (
    <Card className="p-6 border-primary/20 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          {getWeatherIcon()}
        </div>
        <div>
          <h3 className="font-semibold text-lg">Weather</h3>
          <p className="text-sm text-muted-foreground">Current conditions</p>
        </div>
      </div>
      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-12 bg-accent/20 rounded" />
          <div className="h-6 bg-accent/20 rounded w-2/3" />
          <div className="h-4 bg-accent/20 rounded w-1/2" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{weather.temp}°</span>
            <span className="text-muted-foreground">C</span>
          </div>
          <p className="text-lg font-medium">{weather.condition}</p>
          <p className="text-sm text-muted-foreground capitalize">{weather.description}</p>
          <p className="text-sm text-muted-foreground">Humidity: {weather.humidity}%</p>
        </div>
      )}
    </Card>
  );
};

export default WeatherWidget;