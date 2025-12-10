import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, FileText, MapPin } from "lucide-react";
import FIRCard from "@/components/dashboard/FIRCard";

const FIRReport = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [myReports, setMyReports] = useState<any[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const [formData, setFormData] = useState({
    incident_type: "",
    description: "",
  });

  useEffect(() => {
    checkAuth();
    requestLocation();
  }, []);

  // Subscribe to realtime FIR updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('fir-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fir_reports',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setMyReports(prev => prev.map(report => 
            report.id === payload.new.id ? payload.new : report
          ));
          if (payload.new.status === 'closed') {
            toast.success(`Your FIR ${payload.new.fir_number} has been closed by authorities.`);
          } else if (payload.new.status === 'investigating') {
            toast.info(`Your FIR ${payload.new.fir_number} is now under investigation.`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    fetchReports(session.user.id);
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
          console.error("Error getting location:", error);
          toast.error("Unable to get location. Please enable location services.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  const fetchReports = async (userId: string) => {
    const { data, error } = await supabase
      .from("fir_reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reports:", error);
      return;
    }

    setMyReports(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!location) {
      toast.error("Location is required to file FIR");
      return;
    }

    if (!formData.incident_type || !formData.description) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);

    try {
      const firNumber = `FIR${Date.now()}${Math.floor(Math.random() * 1000)}`;

      const { error } = await supabase.from("fir_reports").insert({
        user_id: user.id,
        fir_number: firNumber,
        incident_type: formData.incident_type,
        description: formData.description,
        location_lat: location.lat,
        location_lng: location.lng,
        status: "filed",
      });

      if (error) throw error;

      toast.success("FIR filed successfully");
      setFormData({ incident_type: "", description: "" });
      fetchReports(user.id);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-destructive/5 to-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="hover:bg-accent transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-destructive" />
              File FIR Report
            </h1>
            <div className="w-32" />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* File FIR Form */}
          <Card className="p-6 bg-card/50 backdrop-blur-sm">
            <h2 className="text-xl font-bold mb-4">File New FIR</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Incident Type *</label>
                <Select
                  value={formData.incident_type}
                  onValueChange={(value) => setFormData({ ...formData, incident_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select incident type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="theft">Theft</SelectItem>
                    <SelectItem value="assault">Assault</SelectItem>
                    <SelectItem value="fraud">Fraud</SelectItem>
                    <SelectItem value="lost_documents">Lost Documents</SelectItem>
                    <SelectItem value="accident">Accident</SelectItem>
                    <SelectItem value="harassment">Harassment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description *</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the incident in detail..."
                  rows={6}
                  required
                />
              </div>

              {location && (
                <div className="p-3 bg-accent/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Current Location
                  </p>
                  <p className="text-sm font-mono">
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </p>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Filing FIR..." : "File FIR Report"}
              </Button>
            </form>
          </Card>

          {/* My FIR Reports */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold">My FIR Reports</h2>
            {myReports.length === 0 ? (
              <Card className="p-12 text-center bg-card/50 backdrop-blur-sm">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No FIR reports filed yet</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {myReports.map((report) => (
                  <FIRCard key={report.id} fir={report} profile={profile} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default FIRReport;