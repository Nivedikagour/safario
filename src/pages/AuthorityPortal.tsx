import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Shield, AlertTriangle, Clock, CheckCircle, ArrowLeft } from "lucide-react";

interface Alert {
  id: string;
  user_id: string;
  alert_type: string;
  status: string;
  location_lat: number;
  location_lng: number;
  created_at: string;
  responder_id: string | null;
  response_notes: string | null;
  responded_at: string | null;
  profiles: {
    full_name: string;
    phone_number: string;
  };
}

const AuthorityPortal = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseNotes, setResponseNotes] = useState("");
  const [hasAuthority, setHasAuthority] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error("Please sign in to access this page");
      navigate("/auth");
      return;
    }

    setUser(session.user);

    // Check if user has authority or admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    const isAuthorized = roles?.some(r => r.role === 'authority' || r.role === 'admin');
    
    if (!isAuthorized) {
      toast.error("Access denied: You don't have authority permissions");
      navigate("/dashboard");
      return;
    }

    setHasAuthority(true);
    fetchAlerts();
  };

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("emergency_alerts")
        .select(`
          id,
          user_id,
          alert_type,
          status,
          location_lat,
          location_lng,
          created_at,
          responder_id,
          response_notes,
          responded_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(alert => alert.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, phone_number")
          .in("id", userIds);

        const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        const enrichedAlerts = data.map(alert => ({
          ...alert,
          profiles: profileMap.get(alert.user_id) || { full_name: "Unknown", phone_number: "" }
        }));

        setAlerts(enrichedAlerts as Alert[]);
      } else {
        setAlerts([]);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (alertId: string) => {
    if (!responseNotes.trim()) {
      toast.error("Please add response notes");
      return;
    }

    try {
      const { error } = await supabase
        .from("emergency_alerts")
        .update({
          status: "resolved",
          responder_id: user.id,
          response_notes: responseNotes,
          responded_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) throw error;

      toast.success("Alert marked as resolved");
      setRespondingTo(null);
      setResponseNotes("");
      fetchAlerts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-destructive text-destructive-foreground";
      case "resolved":
        return "bg-green-500 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getAlertIcon = (alertType: string) => {
    return <AlertTriangle className="h-5 w-5 text-destructive" />;
  };

  if (!hasAuthority) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Authority Portal</h1>
            </div>
            <div className="w-32" />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Emergency Alerts Dashboard</h2>
          <p className="text-muted-foreground">Monitor and respond to emergency alerts from tourists</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-6 bg-accent/20 rounded w-1/3 mb-4" />
                <div className="h-4 bg-accent/20 rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <Card className="p-12 text-center bg-card/50 backdrop-blur-sm">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">All Clear</h3>
            <p className="text-muted-foreground">No active emergency alerts at this time</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {alerts.map((alert) => (
              <Card key={alert.id} className="p-6 bg-card/50 backdrop-blur-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-destructive/10 rounded-lg">
                      {getAlertIcon(alert.alert_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold capitalize">
                          {alert.alert_type} Alert
                        </h3>
                        <Badge className={getStatusColor(alert.status)}>
                          {alert.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Reported by: {alert.profiles?.full_name || "Unknown"}
                      </p>
                      {alert.profiles?.phone_number && (
                        <p className="text-sm text-muted-foreground">
                          Contact: {alert.profiles.phone_number}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(alert.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-accent/10 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Location</p>
                    <p className="text-sm font-mono">
                      {alert.location_lat?.toFixed(4)}, {alert.location_lng?.toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <p className="text-sm font-semibold capitalize">{alert.status}</p>
                  </div>
                </div>

                {alert.response_notes && (
                  <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Response Notes</p>
                    <p className="text-sm">{alert.response_notes}</p>
                    {alert.responded_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Resolved at: {new Date(alert.responded_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {alert.status === "active" && (
                  <>
                    {respondingTo === alert.id ? (
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Add response notes..."
                          value={responseNotes}
                          onChange={(e) => setResponseNotes(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button onClick={() => handleRespond(alert.id)} className="flex-1">
                            Mark as Resolved
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setRespondingTo(null);
                              setResponseNotes("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setRespondingTo(alert.id)}
                        className="w-full"
                      >
                        Respond to Alert
                      </Button>
                    )}
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AuthorityPortal;
