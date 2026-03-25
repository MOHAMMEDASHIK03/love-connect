import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { getProfilePhotoUrl } from "@/lib/supabase-helpers";
import { Heart, User, MapPin, Phone } from "lucide-react";

interface MatchProfile {
  user_id: string;
  name: string;
  age: number;
  gender: string;
  location: string;
  mobile: string;
  photo_url: string | null;
  bio?: string;
}

const Matches = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchMatches = async () => {
      // Get accepted interests where user is either sender or receiver
      const { data: interests } = await supabase
        .from("interests")
        .select("from_user_id, to_user_id")
        .eq("status", "accepted")
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

      if (!interests || interests.length === 0) {
        setLoading(false);
        return;
      }

      const matchedUserIds = interests.map((i) =>
        i.from_user_id === user.id ? i.to_user_id : i.from_user_id
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, age, gender, location, mobile, photo_url, bio")
        .in("user_id", matchedUserIds);

      setMatches((profiles as MatchProfile[]) || []);
      setLoading(false);
    };
    fetchMatches();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Your Matches</h1>
          <p className="mt-1 text-muted-foreground">People who mutually accepted interest</p>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Heart className="mx-auto h-8 w-8 animate-pulse text-primary" />
          </div>
        ) : matches.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <Heart className="mx-auto mb-4 h-12 w-12 text-primary/30" />
            <p>No matches yet. Keep browsing!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {matches.map((m) => {
              const photoUrl = getProfilePhotoUrl(m.photo_url);
              return (
                <Card key={m.user_id} className="overflow-hidden shadow-card">
                  <CardContent className="flex gap-4 p-4">
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
                      {photoUrl ? (
                        <img src={photoUrl} alt={m.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <User className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate" style={{ fontFamily: "var(--font-display)" }}>
                        {m.name}, {m.age}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> {m.location}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                        <Phone className="h-3.5 w-3.5" /> {m.mobile}
                      </div>
                      {m.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.bio}</p>}
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        <Heart className="h-3 w-3 fill-green-600" /> Matched
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Matches;
