import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { uploadProfilePhoto } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Upload } from "lucide-react";
import { toast } from "sonner";

const Register = () => {
  const [form, setForm] = useState({
    name: "", email: "", password: "", age: "", gender: "", mobile: "", location: "",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, password, age, gender, mobile, location } = form;

    if (!name || !email || !password || !age || !gender || !mobile || !location) {
      toast.error("Please fill in all fields");
      return;
    }
    if (Number(age) < 18 || Number(age) > 100) {
      toast.error("Age must be between 18 and 100");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

    if (authError) {
      toast.error(authError.message);
      setLoading(false);
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      toast.error("Registration failed");
      setLoading(false);
      return;
    }

    let photoUrl: string | null = null;
    if (photo) {
      try {
        photoUrl = await uploadProfilePhoto(userId, photo);
      } catch {
        console.error("Photo upload failed");
      }
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      user_id: userId,
      name,
      email,
      age: Number(age),
      gender,
      mobile,
      location,
      photo_url: photoUrl,
    });

    setLoading(false);
    if (profileError) {
      toast.error(profileError.message);
    } else {
      toast.success("Registration successful! Please check your email to verify.");
      navigate("/login");
    }
  };

  const updateField = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  return (
    <div className="flex min-h-screen items-center justify-center p-4 gradient-soft">
      <Card className="w-full max-w-lg shadow-elevated">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full gradient-warm">
            <Heart className="h-7 w-7 text-primary-foreground fill-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Join HeartMatch and find your soulmate</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Photo upload */}
            <div className="flex flex-col items-center gap-2">
              <label
                htmlFor="photo"
                className="flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-primary/30 bg-muted transition hover:border-primary"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground" />
                )}
              </label>
              <input id="photo" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              <span className="text-xs text-muted-foreground">Upload Photo</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input placeholder="John Doe" value={form.name} onChange={(e) => updateField("name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" placeholder="••••••••" value={form.password} onChange={(e) => updateField("password", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Age</Label>
                <Input type="number" placeholder="25" min={18} max={100} value={form.age} onChange={(e) => updateField("age", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => updateField("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mobile</Label>
                <Input placeholder="+91 9876543210" value={form.mobile} onChange={(e) => updateField("mobile", e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Location</Label>
                <Input placeholder="Mumbai, India" value={form.location} onChange={(e) => updateField("location", e.target.value)} />
              </div>
            </div>

            <Button type="submit" className="w-full gradient-warm border-0" disabled={loading}>
              {loading ? "Creating account..." : "Register"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
