import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Shield, ArrowLeft, Users, UserCheck, Clock, CheckCircle, XCircle } from "lucide-react";

interface UserRole {
  id: string;
  user_id: string;
  role: "user" | "authority" | "admin";
  role_status: "pending" | "approved" | "rejected";
  profiles: {
    full_name: string;
    phone_number: string;
    profile_image_url: string | null;
  };
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRole[]>([]);
  const [pendingRequests, setPendingRequests] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAdmin, setHasAdmin] = useState(false);

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

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, role_status")
      .eq("user_id", session.user.id);

    const isAdmin = roles?.some(r => r.role === 'admin' && r.role_status === 'approved');
    
    if (!isAdmin) {
      toast.error("Access denied: Admin privileges required");
      navigate("/dashboard");
      return;
    }

    setHasAdmin(true);
    fetchUsers();
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          id,
          user_id,
          role,
          role_status
        `)
        .order("role_status", { ascending: true })
        .order("role", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(u => u.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, phone_number, profile_image_url")
          .in("id", userIds);

        const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        const enrichedUsers = data.map(user => ({
          ...user,
          profiles: profileMap.get(user.user_id) || { full_name: "Unknown", phone_number: "", profile_image_url: null }
        }));

        // Separate pending requests from approved users
        const pending = enrichedUsers.filter(u => u.role_status === 'pending');
        const approved = enrichedUsers.filter(u => u.role_status === 'approved');

        setPendingRequests(pending as UserRole[]);
        setUsers(approved as UserRole[]);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role_status: 'approved' })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success(`${role} role approved successfully!`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRejectRequest = async (userId: string) => {
    try {
      // Reject the request and downgrade to 'user' role
      const { error } = await supabase
        .from("user_roles")
        .update({ role: 'user', role_status: 'approved' })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Role request rejected. User set to regular user.");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRoleChange = async (userId: string, newRole: "user" | "authority" | "admin") => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole, role_status: 'approved' })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success(`Role updated to ${newRole}`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-destructive text-destructive-foreground";
      case "authority":
        return "bg-primary text-primary-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-600 border-yellow-500/30";
      case "approved":
        return "bg-green-500/20 text-green-600 border-green-500/30";
      case "rejected":
        return "bg-red-500/20 text-red-600 border-red-500/30";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  if (!hasAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            </div>
            <div className="w-32" />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">User Role Management</h2>
          <p className="text-muted-foreground">Manage user roles and approve role requests</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingRequests.length}</p>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'user').length}</p>
                <p className="text-sm text-muted-foreground">Regular Users</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Shield className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'authority').length}</p>
                <p className="text-sm text-muted-foreground">Authorities</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-lg">
                <UserCheck className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
                <p className="text-sm text-muted-foreground">Admins</p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Requests
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1">{pendingRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              All Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {loading ? (
              <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="h-6 bg-accent/20 rounded w-1/3 mb-4" />
                    <div className="h-4 bg-accent/20 rounded w-1/2" />
                  </Card>
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <Card className="p-12 bg-card/50 backdrop-blur-sm text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Pending Requests</h3>
                <p className="text-muted-foreground">All role requests have been processed.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {pendingRequests.map((request) => (
                  <Card key={request.id} className="p-6 bg-card/50 backdrop-blur-sm border-yellow-500/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          {request.profiles?.profile_image_url ? (
                            <img src={request.profiles.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <Users className="h-6 w-6 text-primary" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold">
                              {request.profiles?.full_name || "Unknown User"}
                            </h3>
                            <Badge className={getRoleBadgeColor(request.role)}>
                              Requesting: {request.role}
                            </Badge>
                            <Badge variant="outline" className={getStatusBadgeColor(request.role_status)}>
                              Pending Approval
                            </Badge>
                          </div>
                          {request.profiles?.phone_number && (
                            <p className="text-sm text-muted-foreground">
                              {request.profiles.phone_number}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          className="border-green-500 text-green-600 hover:bg-green-500/10"
                          onClick={() => handleApproveRequest(request.user_id, request.role)}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          className="border-red-500 text-red-600 hover:bg-red-500/10"
                          onClick={() => handleRejectRequest(request.user_id)}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            {loading ? (
              <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="h-6 bg-accent/20 rounded w-1/3 mb-4" />
                    <div className="h-4 bg-accent/20 rounded w-1/2" />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {users.map((user) => (
                  <Card key={user.id} className="p-6 bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          {user.profiles?.profile_image_url ? (
                            <img src={user.profiles.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <Users className="h-6 w-6 text-primary" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold">
                              {user.profiles?.full_name || "Unknown User"}
                            </h3>
                            <Badge className={getRoleBadgeColor(user.role)}>
                              {user.role}
                            </Badge>
                          </div>
                          {user.profiles?.phone_number && (
                            <p className="text-sm text-muted-foreground">
                              {user.profiles.phone_number}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="w-48">
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.user_id, value as "user" | "authority" | "admin")}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="authority">Authority</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPanel;