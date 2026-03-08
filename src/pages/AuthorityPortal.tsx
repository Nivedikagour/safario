import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Shield, AlertTriangle, Clock, CheckCircle, ArrowLeft, FileText, Package, Navigation, MapPin, BarChart3, TrendingUp, Search, Map as MapIcon } from "lucide-react";
import { useMemo } from "react";
import ZoneManagement from "@/components/dashboard/ZoneManagement";

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

interface FIRReport {
  id: string;
  user_id: string;
  fir_number: string;
  incident_type: string;
  description: string;
  status: string;
  location_lat: number;
  location_lng: number;
  created_at: string;
  profiles: {
    full_name: string;
    phone_number: string;
  };
}

interface LostItem {
  id: string;
  user_id: string;
  item_name: string;
  description: string;
  status: string;
  image_url: string | null;
  location_lat: number;
  location_lng: number;
  created_at: string;
  profiles: {
    full_name: string;
    phone_number: string;
  };
}

const FIRStats = ({ reports }: { reports: FIRReport[] }) => {
  const stats = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return {
      total: reports.length,
      filed: reports.filter(r => r.status === 'filed').length,
      investigating: reports.filter(r => r.status === 'investigating').length,
      closed: reports.filter(r => r.status === 'closed').length,
      recent: reports.filter(r => new Date(r.created_at) >= sevenDaysAgo).length,
    };
  }, [reports]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Card className="p-4 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-4 w-4 text-primary" />
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <p className="text-2xl font-bold">{stats.total}</p>
      </Card>
      <Card className="p-4 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <p className="text-2xl font-bold">{stats.filed}</p>
      </Card>
      <Card className="p-4 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1">
          <Search className="h-4 w-4 text-yellow-500" />
          <p className="text-xs text-muted-foreground">Investigating</p>
        </div>
        <p className="text-2xl font-bold">{stats.investigating}</p>
      </Card>
      <Card className="p-4 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <p className="text-xs text-muted-foreground">Closed</p>
        </div>
        <p className="text-2xl font-bold">{stats.closed}</p>
      </Card>
      <Card className="p-4 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-4 w-4 text-primary" />
          <p className="text-xs text-muted-foreground">Last 7 Days</p>
        </div>
        <p className="text-2xl font-bold">{stats.recent}</p>
      </Card>
    </div>
  );
};

const LostItemStats = ({ items }: { items: LostItem[] }) => {
  const stats = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return {
      total: items.length,
      lost: items.filter(i => i.status === 'lost').length,
      found: items.filter(i => i.status === 'found').length,
      recent: items.filter(i => new Date(i.created_at) >= sevenDaysAgo).length,
    };
  }, [items]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="p-4 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-4 w-4 text-primary" />
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <p className="text-2xl font-bold">{stats.total}</p>
      </Card>
      <Card className="p-4 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1">
          <Package className="h-4 w-4 text-destructive" />
          <p className="text-xs text-muted-foreground">Still Lost</p>
        </div>
        <p className="text-2xl font-bold">{stats.lost}</p>
      </Card>
      <Card className="p-4 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <p className="text-xs text-muted-foreground">Found</p>
        </div>
        <p className="text-2xl font-bold">{stats.found}</p>
      </Card>
      <Card className="p-4 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-4 w-4 text-primary" />
          <p className="text-xs text-muted-foreground">Last 7 Days</p>
        </div>
        <p className="text-2xl font-bold">{stats.recent}</p>
      </Card>
    </div>
  );
};

const AuthorityPortal = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [firReports, setFirReports] = useState<FIRReport[]>([]);
  const [lostItems, setLostItems] = useState<LostItem[]>([]);
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
    fetchAllData();
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchAlerts(), fetchFIRReports(), fetchLostItems()]);
    setLoading(false);
  };

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from("emergency_alerts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

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
      console.error("Error fetching alerts:", error);
    }
  };

  const fetchFIRReports = async () => {
    try {
      const { data, error } = await supabase
        .from("fir_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(report => report.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, phone_number")
          .in("id", userIds);

        const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        const enrichedReports = data.map(report => ({
          ...report,
          profiles: profileMap.get(report.user_id) || { full_name: "Unknown", phone_number: "" }
        }));

        setFirReports(enrichedReports as FIRReport[]);
      } else {
        setFirReports([]);
      }
    } catch (error: any) {
      console.error("Error fetching FIR reports:", error);
    }
  };

  const fetchLostItems = async () => {
    try {
      const { data, error } = await supabase
        .from("lost_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(item => item.user_id).filter(Boolean))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, phone_number")
          .in("id", userIds);

        const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        const enrichedItems = data.map(item => ({
          ...item,
          profiles: profileMap.get(item.user_id) || { full_name: "Unknown", phone_number: "" }
        }));

        setLostItems(enrichedItems as LostItem[]);
      } else {
        setLostItems([]);
      }
    } catch (error: any) {
      console.error("Error fetching lost items:", error);
    }
  };

  const handleRespondAlert = async (alertId: string) => {
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

  const handleUpdateFIRStatus = async (firId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("fir_reports")
        .update({ status: newStatus })
        .eq("id", firId);

      if (error) throw error;

      toast.success(`FIR status updated to ${newStatus}`);
      fetchFIRReports();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdateLostItemStatus = async (itemId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("lost_items")
        .update({ 
          status: newStatus,
          found_at: newStatus === 'found' ? new Date().toISOString() : null
        })
        .eq("id", itemId);

      if (error) throw error;

      toast.success(`Item status updated to ${newStatus}`);
      fetchLostItems();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "lost":
      case "filed":
        return "bg-destructive text-destructive-foreground";
      case "resolved":
      case "found":
      case "closed":
        return "bg-green-500 text-white";
      case "investigating":
        return "bg-yellow-500 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
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
        <Tabs defaultValue="alerts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 text-xs sm:text-sm">
            <TabsTrigger value="alerts" className="flex items-center gap-1 sm:gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts ({alerts.length})</span>
              <span className="sm:hidden">{alerts.length}</span>
            </TabsTrigger>
            <TabsTrigger value="fir" className="flex items-center gap-1 sm:gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">FIR ({firReports.length})</span>
              <span className="sm:hidden">{firReports.length}</span>
            </TabsTrigger>
            <TabsTrigger value="lost" className="flex items-center gap-1 sm:gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Lost ({lostItems.length})</span>
              <span className="sm:hidden">{lostItems.length}</span>
            </TabsTrigger>
            <TabsTrigger value="zones" className="flex items-center gap-1 sm:gap-2">
              <MapIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Geofence Zones</span>
              <span className="sm:hidden">Zones</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="space-y-4">
            <h2 className="text-2xl font-bold">Emergency Alerts</h2>
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
                <p className="text-muted-foreground">No emergency alerts</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {alerts.map((alert) => (
                  <Card key={alert.id} className="p-6 bg-card/50 backdrop-blur-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-destructive/10 rounded-lg">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
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
                            Reported by: {alert.profiles?.full_name}
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
                              <Button onClick={() => handleRespondAlert(alert.id)} className="flex-1">
                                Mark as Resolved
                              </Button>
                              <Button variant="outline" onClick={() => { setRespondingTo(null); setResponseNotes(""); }}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => {
                                window.open(
                                  `https://www.google.com/maps/dir/?api=1&destination=${alert.location_lat},${alert.location_lng}`,
                                  '_blank'
                                );
                              }} 
                              variant="outline"
                              className="flex-1"
                            >
                              <Navigation className="mr-2 h-4 w-4" />
                              Get Directions
                            </Button>
                            <Button onClick={() => setRespondingTo(alert.id)} className="flex-1">
                              <MapPin className="mr-2 h-4 w-4" />
                              Respond to Alert
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="fir" className="space-y-4">
            <h2 className="text-2xl font-bold">FIR Reports</h2>
            {firReports.length > 0 && <FIRStats reports={firReports} />}
            {firReports.length === 0 ? (
              <Card className="p-12 text-center bg-card/50 backdrop-blur-sm">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No FIR Reports</h3>
                <p className="text-muted-foreground">No FIR reports have been filed</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {firReports.map((report) => (
                  <Card key={report.id} className="p-6 bg-card/50 backdrop-blur-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold">{report.fir_number}</h3>
                          <Badge className={getStatusColor(report.status)}>
                            {report.status}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium capitalize">{report.incident_type.replace('_', ' ')}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Filed by: {report.profiles?.full_name}
                        </p>
                        {report.profiles?.phone_number && (
                          <p className="text-sm text-muted-foreground">
                            Contact: {report.profiles.phone_number}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {new Date(report.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="p-3 bg-accent/10 rounded-lg mb-4">
                      <p className="text-xs text-muted-foreground mb-1">Description</p>
                      <p className="text-sm">{report.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-accent/10 rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Location</p>
                        <p className="text-sm font-mono">
                          {report.location_lat?.toFixed(4)}, {report.location_lng?.toFixed(4)}
                        </p>
                      </div>
                    </div>

                    {report.status !== 'closed' && (
                      <div className="flex gap-2">
                        {report.status === 'filed' && (
                          <Button onClick={() => handleUpdateFIRStatus(report.id, 'investigating')} variant="outline" className="flex-1">
                            Start Investigation
                          </Button>
                        )}
                        <Button onClick={() => handleUpdateFIRStatus(report.id, 'closed')} className="flex-1">
                          Close FIR
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="lost" className="space-y-4">
            <h2 className="text-2xl font-bold">Lost Items</h2>
            {lostItems.length > 0 && <LostItemStats items={lostItems} />}
            {lostItems.length === 0 ? (
              <Card className="p-12 text-center bg-card/50 backdrop-blur-sm">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Lost Items</h3>
                <p className="text-muted-foreground">No lost item reports</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lostItems.map((item) => (
                  <Card key={item.id} className="p-6 bg-card/50 backdrop-blur-sm">
                    <div className="flex gap-4">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.item_name}
                          className="w-24 h-24 object-cover rounded-lg border border-border"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold">{item.item_name}</h3>
                          <Badge className={getStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Reported by: {item.profiles?.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {item.status === 'lost' && (
                      <Button 
                        onClick={() => handleUpdateLostItemStatus(item.id, 'found')} 
                        className="w-full mt-4"
                        variant="outline"
                      >
                        Mark as Found
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="zones">
            <ZoneManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AuthorityPortal;