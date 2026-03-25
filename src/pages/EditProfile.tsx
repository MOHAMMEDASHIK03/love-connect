import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uploadProfilePhoto, getProfilePhotoUrl } from "@/lib/supabase-helpers";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, User, Heart } from "lucide-react";
import { toast } from "sonner";

const EditProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", age: "", gender: "", mobile: "", location: "", bio: "" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (data) {
        setForm({
          name: data.name,
          age: String(data.age),
          gender: data.gender,
          mobile: data.mobile,
          location: data.location,
          bio: (data as any).bio || "",
        });
        setExistingPhotoUrl(getProfilePhotoUrl(data.photo_url));
      }
      setFetching(false);
    };
    fetch();
  }, [user]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { name, age, gender, mobile, location, bio } = form;
    if (!name || !age || !gender || !mobile || !location) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    let updateData: any = { name, age: Number(age), gender, mobile, location, bio };

    if (photo) {
      try {
        const path = await uploadProfilePhoto(user.id, photo);
        updateData.photo_url = path;
      } catch {
        toast.error("Photo upload failed");
      }
    }

    const { error } = await supabase.from("profiles").update(updateData).eq("user_id", user.id);
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile updated!");
      navigate("/");
    }
  };

  const updateField = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));
  const displayPhoto = photoPreview || existingPhotoUrl;

  if (authLoading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Heart className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-lg px-4 py-8">
        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle className="text-2xl">Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col items-center gap-2">
                <label
                  htmlFor="photo"
                  className="flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-primary/30 bg-muted transition hover:border-primary"
                >
                  {displayPhoto ? (
                    <img src={displayPhoto} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-muted-foreground" />
                  )}
                </label>
                <input id="photo" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Upload className="h-3 w-3" /> Change Photo
                </span>
              </div>

              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input type="number" min={18} max={100} value={form.age} onChange={(e) => updateField("age", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => updateField("gender", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mobile</Label>
                <Input value={form.mobile} onChange={(e) => updateField("mobile", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => updateField("location", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea placeholder="Tell people about yourself..." value={form.bio} onChange={(e) => updateField("bio", e.target.value)} rows={3} />
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1 gradient-warm border-0" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/")}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EditProfile;
