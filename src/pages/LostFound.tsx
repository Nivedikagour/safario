import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Search } from "lucide-react";

const LostFound = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    item_name: "",
    description: "",
  });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        requestLocation();
      }
    });
  }, [navigate]);

  // Fetch items when user is set
  useEffect(() => {
    if (user) {
      fetchLostItems();
      
      // Subscribe to realtime updates for user's lost items
      const channel = supabase
        .channel('lost-items-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'lost_items',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            setItems(prev => prev.map(item => 
              item.id === payload.new.id ? payload.new : item
            ));
            if (payload.new.status === 'found') {
              toast.success(`Your item "${payload.new.item_name}" has been marked as found!`);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.error("Location error:", error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  const fetchLostItems = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("lost_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      setItems(data);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const generateFIRForLostItem = async (itemName: string, description: string, lat: number, lng: number) => {
    const firNumber = `FIR-LOST-${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    const { error } = await supabase.from("fir_reports").insert({
      user_id: user.id,
      fir_number: firNumber,
      incident_type: "lost_documents",
      description: `Lost Item Report: ${itemName}\n\nDescription: ${description}\n\nThis FIR was automatically generated for a lost item report.`,
      location_lat: lat,
      location_lng: lng,
      status: "filed",
    });

    if (error) {
      console.error("Error generating FIR:", error);
      throw error;
    }

    return firNumber;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      let imageUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('lost-items')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('lost-items')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      const { error } = await supabase.from("lost_items").insert([
        {
          user_id: user.id,
          item_name: formData.item_name,
          description: formData.description,
          image_url: imageUrl,
          location_lat: location?.lat,
          location_lng: location?.lng,
          status: "lost",
        },
      ]);

      if (error) throw error;

      // Auto-generate FIR for the lost item
      if (location) {
        const firNumber = await generateFIRForLostItem(
          formData.item_name,
          formData.description,
          location.lat,
          location.lng
        );
        toast.success(`Lost item reported! FIR ${firNumber} has been automatically generated.`);
      } else {
        toast.success("Lost item report submitted successfully!");
      }

      setFormData({ item_name: "", description: "" });
      setImageFile(null);
      setImagePreview(null);
      fetchLostItems();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Lost & Found</h1>
            <div className="w-24" />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6 bg-card/50 backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-4">Report Lost Item</h2>
            <p className="text-sm text-muted-foreground mb-4">
              An FIR will be automatically generated when you submit this report.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="item_name">Item Name</Label>
                <Input
                  id="item_name"
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  required
                  placeholder="e.g., Backpack, Phone, Wallet"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  placeholder="Provide details about your lost item..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Item Photo (Optional)</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="cursor-pointer"
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg border border-border"
                    />
                  </div>
                )}
              </div>

              {location && (
                <div className="text-sm text-muted-foreground">
                  Location captured: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Submitting..." : "Submit Report & Generate FIR"}
              </Button>
            </form>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Recent Reports</h2>
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="space-y-3">
              {items.length > 0 ? (
                items.map((item) => (
                  <Card key={item.id} className="p-4 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
                    <div className="flex gap-4">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.item_name}
                          className="w-24 h-24 object-cover rounded-lg border border-border"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{item.item_name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Reported: {new Date(item.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-3 py-1 text-xs rounded-full ${
                            item.status === 'found' 
                              ? 'bg-green-500/10 text-green-500' 
                              : 'bg-destructive/10 text-destructive'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="p-8 text-center bg-card/50 backdrop-blur-sm">
                  <p className="text-muted-foreground">No reports yet</p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LostFound;