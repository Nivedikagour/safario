import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Phone, Mail, User } from "lucide-react";

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone_number: string;
  email?: string;
}

interface EmergencyContactsProps {
  userId: string;
}

const EmergencyContacts = ({ userId }: EmergencyContactsProps) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    relationship: "",
    phone_number: "",
    email: "",
  });

  useEffect(() => {
    fetchContacts();
  }, [userId]);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("emergency_contacts").insert([
        {
          user_id: userId,
          ...formData,
        },
      ]);

      if (error) throw error;

      toast.success("Emergency contact added!");
      setFormData({ name: "", relationship: "", phone_number: "", email: "" });
      setShowForm(false);
      fetchContacts();
    } catch (error: any) {
      toast.error(error.message || "Failed to add contact");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("emergency_contacts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Contact deleted");
      fetchContacts();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete contact");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Emergency Contacts
        </CardTitle>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 border border-border rounded-lg bg-accent/10">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship</Label>
              <Input
                id="relationship"
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                required
                placeholder="Father, Mother, Friend, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                required
                placeholder="+1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add Contact"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ name: "", relationship: "", phone_number: "", email: "" });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {contacts.length === 0 && !showForm ? (
          <p className="text-muted-foreground text-center py-8">
            No emergency contacts added yet
          </p>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-start justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-foreground">{contact.name}</h3>
                    <span className="text-xs text-muted-foreground">({contact.relationship})</span>
                  </div>
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{contact.phone_number}</span>
                    </div>
                    {contact.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{contact.email}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(contact.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmergencyContacts;
