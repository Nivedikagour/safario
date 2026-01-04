import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, User, ArrowLeft } from "lucide-react";
import idGenerationBg from "@/assets/id-generation-bg-new.jpg";

const languages = [
  "English", "Hindi", "Marathi", "French", "Spanish", "Gujarati", "Tamil", "Telugu", "Bengali"
];

const IDGeneration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    gender: "",
    age: "",
    date_of_birth: "",
    passport_number: "",
    aadhar_number: "",
    preferred_language: "English",
    role: "user" as "user" | "authority" | "admin",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        // Check if profile already exists
        checkProfile(session.user.id);
      }
    });
  }, [navigate]);

  const checkProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileData) {
      // Check user role and redirect accordingly
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (roleData?.role === "authority") {
        navigate("/authority");
      } else if (roleData?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error("Please select a valid image file (JPEG, PNG, or WebP)");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5242880) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('profiles')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(fileName);

      setProfileImage(publicUrl);
      toast.success("Profile photo uploaded!");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Upsert profile (insert or update if exists)
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: formData.full_name,
        gender: formData.gender,
        age: parseInt(formData.age),
        date_of_birth: formData.date_of_birth,
        passport_number: formData.passport_number || null,
        aadhar_number: formData.aadhar_number || null,
        preferred_language: formData.preferred_language,
        profile_image_url: profileImage,
      }, { onConflict: 'id' });

      if (profileError) throw profileError;

      // Determine role status - admin/authority require approval
      const isPrivilegedRole = formData.role === "admin" || formData.role === "authority";
      const roleStatus = isPrivilegedRole ? "pending" : "approved";

      // Insert user role with appropriate status
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: user.id,
        role: formData.role,
        role_status: roleStatus,
      });

      if (roleError) throw roleError;

      if (isPrivilegedRole) {
        toast.success("Your ID has been created! Your role request is pending admin approval. You can access the app as a regular user for now.");
        navigate("/dashboard");
      } else {
        toast.success("Digital ID created successfully!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create ID");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToAuth = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${idGenerationBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background" />

      <div className="relative z-10 w-full max-w-2xl">
        <div className="bg-card border border-border rounded-lg shadow-2xl p-8">
          <Button
            variant="ghost"
            onClick={handleBackToAuth}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2">Generate Your Digital ID</h1>
          <p className="text-muted-foreground mb-8">Complete your profile to access Safario</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Profile Photo Upload */}
              <div className="space-y-2 md:col-span-2">
                <Label>Profile Photo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border bg-accent/20 flex items-center justify-center overflow-hidden">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? "Uploading..." : "Upload Photo"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      JPG, PNG or WebP (Max 5MB)
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="language">Preferred Language</Label>
                <Select
                  value={formData.preferred_language}
                  onValueChange={(value) => setFormData({ ...formData, preferred_language: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang} value={lang.toLowerCase()}>
                        {lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="role">Account Type</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: "user" | "authority" | "admin") => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User (Tourist)</SelectItem>
                    <SelectItem value="authority">Authority (Police/Emergency) - Requires Approval</SelectItem>
                    <SelectItem value="admin">Admin - Requires Approval</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.role === "user" && "Access to tourist features, emergency alerts, and safety tools"}
                  {formData.role === "authority" && "⚠️ Requires admin approval. You'll get regular user access until approved."}
                  {formData.role === "admin" && "⚠️ Requires admin approval. You'll get regular user access until approved."}
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  required
                  min="1"
                  max="120"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passport_number">Passport Number (Optional)</Label>
                <Input
                  id="passport_number"
                  value={formData.passport_number}
                  onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="aadhar_number">Aadhar Number (Optional)</Label>
                <Input
                  id="aadhar_number"
                  value={formData.aadhar_number}
                  onChange={(e) => setFormData({ ...formData, aadhar_number: e.target.value })}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Generating ID..." : "Generate Digital ID"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default IDGeneration;