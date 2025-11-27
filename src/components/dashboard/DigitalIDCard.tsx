import { Card } from "@/components/ui/card";
import { User, Calendar, MapPin, Phone, Globe } from "lucide-react";

interface DigitalIDCardProps {
  profile: {
    full_name: string;
    date_of_birth: string;
    gender: string;
    passport_number?: string;
    aadhar_number?: string;
    preferred_language: string;
    profile_image_url?: string;
  };
}

const DigitalIDCard = ({ profile }: DigitalIDCardProps) => {
  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-card to-accent/10 border-2 border-primary/30 shadow-xl">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
      </div>

      <div className="relative p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">DIGITAL ID CARD</h3>
            <p className="text-xs text-muted-foreground">Safario Travel ID</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
            <Globe className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Photo Section */}
          <div className="flex flex-col items-center space-y-2">
            {profile.profile_image_url ? (
              <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-primary/50 shadow-lg">
                <img 
                  src={profile.profile_image_url} 
                  alt={profile.full_name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-lg bg-accent/30 border-2 border-primary/50 flex items-center justify-center">
                <User className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Profile Photo</p>
            </div>
          </div>

          {/* Personal Details */}
          <div className="md:col-span-2 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1">Full Name</p>
              <p className="text-lg font-bold text-foreground">{profile.full_name}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Date of Birth
                </p>
                <p className="text-sm font-semibold">{new Date(profile.date_of_birth).toLocaleDateString()}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1">Gender</p>
                <p className="text-sm font-semibold capitalize">{profile.gender}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {profile.passport_number && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Passport
                  </p>
                  <p className="text-sm font-semibold font-mono">{profile.passport_number}</p>
                </div>
              )}

              {profile.aadhar_number && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Aadhar
                  </p>
                  <p className="text-sm font-semibold font-mono">{profile.aadhar_number}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1">Preferred Language</p>
              <p className="text-sm font-semibold capitalize">{profile.preferred_language}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 pt-4 mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Valid for International Travel</span>
            <span className="font-mono">ID: {profile.passport_number?.slice(-6) || profile.aadhar_number?.slice(-6) || '******'}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DigitalIDCard;
