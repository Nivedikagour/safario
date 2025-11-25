import { Card } from "@/components/ui/card";
import { Cloud, CloudRain, Sun } from "lucide-react";
import { useEffect, useState } from "react";

interface WeatherWidgetProps {
  location: { lat: number; lng: number } | null;
}

const WeatherWidget = ({ location }: WeatherWidgetProps) => {
  const [weather, setWeather] = useState({
    temp: 24,
    condition: "Sunny",
    humidity: 65,
  });

  useEffect(() => {
    if (location) {
      // Simulate weather data
      // In production, this would call a weather API
      const conditions = ["Sunny", "Cloudy", "Rainy"];
      const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
      setWeather({
        temp: Math.floor(Math.random() * 15) + 15,
        condition: randomCondition,
        humidity: Math.floor(Math.random() * 40) + 40,
      });
    }
  }, [location]);

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
      <div className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">{weather.temp}°</span>
          <span className="text-muted-foreground">C</span>
        </div>
        <p className="text-lg font-medium">{weather.condition}</p>
        <p className="text-sm text-muted-foreground">Humidity: {weather.humidity}%</p>
      </div>
    </Card>
  );
};

export default WeatherWidget;