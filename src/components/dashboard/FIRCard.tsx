import { Card } from "@/components/ui/card";
import { FileText, Calendar, MapPin, User, AlertCircle, Shield } from "lucide-react";

interface FIRCardProps {
  fir: {
    id: string;
    incident_type: string;
    description: string;
    location_lat: number;
    location_lng: number;
    created_at: string;
    status: string;
    fir_number: string;
  };
  profile: {
    full_name: string;
    phone_number?: string;
    aadhar_number?: string;
  };
}

const FIRCard = ({ fir, profile }: FIRCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "filed":
        return "text-yellow-500";
      case "under_investigation":
        return "text-blue-500";
      case "resolved":
        return "text-green-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-destructive/5 via-card to-accent/5 border-2 border-destructive/20 shadow-xl">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(220,38,38,0.3),rgba(255,255,255,0))]" />
      </div>

      <div className="relative p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">FIR REPORT</h3>
            <p className="text-xs text-muted-foreground">First Information Report</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center border-2 border-destructive">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
        </div>

        {/* FIR Number & Status */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-accent/20 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <FileText className="h-3 w-3" />
              FIR Number
            </p>
            <p className="text-sm font-bold font-mono">{fir.fir_number}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase mb-1">Status</p>
            <p className={`text-sm font-semibold capitalize ${getStatusColor(fir.status)}`}>
              {fir.status.replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* Complainant Details */}
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <User className="h-3 w-3" />
              Complainant Name
            </p>
            <p className="text-base font-bold text-foreground">{profile.full_name}</p>
          </div>

          {profile.phone_number && (
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1">Contact Number</p>
              <p className="text-sm font-semibold font-mono">{profile.phone_number}</p>
            </div>
          )}

          {profile.aadhar_number && (
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1">Aadhar Number</p>
              <p className="text-sm font-semibold font-mono">{profile.aadhar_number}</p>
            </div>
          )}
        </div>

        {/* Incident Details */}
        <div className="space-y-3 border-t border-border/50 pt-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Incident Type
            </p>
            <p className="text-sm font-semibold capitalize">{fir.incident_type.replace('_', ' ')}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase mb-1">Description</p>
            <p className="text-sm leading-relaxed">{fir.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Location
              </p>
              <p className="text-xs font-mono">
                {fir.location_lat.toFixed(4)}, {fir.location_lng.toFixed(4)}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Filed On
              </p>
              <p className="text-xs">{new Date(fir.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 pt-4 mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Official Document - Keep Secure</span>
            <span className="font-mono">ID: {fir.id.slice(0, 8)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default FIRCard;