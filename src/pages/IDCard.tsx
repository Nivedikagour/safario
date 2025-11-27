import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import DigitalIDCard from "@/components/dashboard/DigitalIDCard";
import { toast } from "sonner";

const IDCard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error || !data) {
        toast.error("Profile not found");
        navigate("/dashboard");
      } else {
        setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
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
            <h1 className="text-2xl font-bold text-foreground">Digital ID Card</h1>
            <div className="w-40" />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6 flex justify-end">
          <Button variant="outline" onClick={() => toast.info("Download feature coming soon!")}>
            <Download className="mr-2 h-4 w-4" />
            Download ID
          </Button>
        </div>

        {profile && <DigitalIDCard profile={profile} />}

        <div className="mt-8 p-6 bg-card/50 backdrop-blur-sm rounded-lg border border-border">
          <h3 className="text-lg font-semibold mb-4">About Your Digital ID</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• This digital ID is valid for identification within the Safario platform</li>
            <li>• Keep your profile information up to date for accurate emergency assistance</li>
            <li>• Your ID includes your photo, personal details, and travel documents</li>
            <li>• This information is securely stored and only accessible to you</li>
            <li>• In case of emergency, authorities can verify your identity through this ID</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default IDCard;
