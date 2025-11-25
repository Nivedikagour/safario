import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { useEffect, useState } from "react";

interface SafetyScoreProps {
  location: { lat: number; lng: number } | null;
}

const SafetyScore = ({ location }: SafetyScoreProps) => {
  const [score, setScore] = useState(85);
  const [risk, setRisk] = useState("Low");

  useEffect(() => {
    if (location) {
      // Simulate safety score calculation based on location
      // In production, this would call crime and weather APIs
      const calculatedScore = Math.floor(Math.random() * 30) + 70;
      setScore(calculatedScore);
      
      if (calculatedScore >= 80) {
        setRisk("Low");
      } else if (calculatedScore >= 60) {
        setRisk("Medium");
      } else {
        setRisk("High");
      }
    }
  }, [location]);

  const getScoreColor = () => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <Card className="p-6 border-primary/20 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Safety Score</h3>
          <p className="text-sm text-muted-foreground">Current area assessment</p>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-bold ${getScoreColor()}`}>{score}</span>
          <span className="text-muted-foreground">/100</span>
        </div>
        <div className="w-full bg-accent/20 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500"
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="text-sm">
          Risk Level: <span className={`font-semibold ${getScoreColor()}`}>{risk}</span>
        </p>
      </div>
    </Card>
  );
};

export default SafetyScore;