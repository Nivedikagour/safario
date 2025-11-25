import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface AlertButtonProps {
  location: { lat: number; lng: number } | null;
  userId: string;
}

const AlertButton = ({ location, userId }: AlertButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleEmergencyAlert = async () => {
    if (!location) {
      toast.error("Location not available");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("emergency_alerts").insert([
        {
          user_id: userId,
          location_lat: location.lat,
          location_lng: location.lng,
          alert_type: "emergency",
          status: "active",
        },
      ]);

      if (error) throw error;

      toast.success("Emergency alert sent to authorities!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send alert");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="destructive"
      size="lg"
      className="w-full"
      onClick={handleEmergencyAlert}
      disabled={loading || !location}
    >
      <AlertTriangle className="mr-2 h-5 w-5" />
      {loading ? "Sending Alert..." : "Send Emergency Alert"}
    </Button>
  );
};

export default AlertButton;