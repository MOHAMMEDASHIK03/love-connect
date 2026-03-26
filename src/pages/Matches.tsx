import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getProfilePhotoUrl } from "@/lib/supabase-helpers";
import { Heart, User, MapPin, Phone, Eye, HeartOff, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface MatchProfile {
  user_id: string;
  name: string;
  age: number;
  gender: string;
  location: string;
  mobile: string;
  email: string;
  photo_url: string | null;
  bio?: string;
}

const Matches = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<MatchProfile | null>(null);
  const [unmatchingId, setUnmatchingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchMatches();
  }, [user]);

  const fetchMatches = async () => {
    if (!user) return;
    const { data: interests } = await supabase
      .from("interests")
      .select("from_user_id, to_user_id")
      .eq("status", "accepted")
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

    if (!interests || interests.length === 0) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const matchedUserIds = interests.map((i) =>
      i.from_user_id === user.id ? i.to_user_id : i.from_user_id
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, age, gender, location, mobile, email, photo_url, bio")
      .in("user_id", matchedUserIds);

    setMatches((profiles as MatchProfile[]) || []);
    setLoading(false);
  };

  const handleUnmatch = async (matchUserId: string) => {
    if (!user) return;
    setUnmatchingId(matchUserId);

    // Delete the interest record(s) between the two users
    const { error: e1 } = await supabase
      .from("interests")
      .delete()
      .eq("from_user_id", user.id)
      .eq("to_user_id", matchUserId);

    const { error: e2 } = await supabase
      .from("interests")
      .delete()
      .eq("from_user_id", matchUserId)
      .eq("to_user_id", user.id);

    setUnmatchingId(null);

    if (e1 || e2) {
      toast.error("Failed to unmatch");
    } else {
      setMatches((prev) => prev.filter((m) => m.user_id !== matchUserId));
      setSelectedProfile(null);
      toast.success("Unmatched. Both profiles are now visible in browse again.");
    }
  };

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
                  <CardContent className="flex flex-col xs:flex-row gap-4 p-4">
                    <div className="h-24 w-24 flex-shrink-0 mx-auto xs:mx-0 overflow-hidden rounded-xl bg-muted">
                      {photoUrl ? (
                        <img src={photoUrl} alt={m.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <User className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-center xs:text-left">
                      <h3 className="font-semibold text-lg truncate" style={{ fontFamily: "var(--font-display)" }}>
                        {m.name}, {m.age}
                      </h3>
                      <div className="flex items-center justify-center xs:justify-start gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" /> <span className="truncate">{m.location}</span>
                      </div>
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        <Heart className="h-3 w-3 fill-green-600" /> Matched
                      </span>
                      <div className="mt-2 flex flex-wrap gap-2 justify-center xs:justify-start">
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSelectedProfile(m)}>
                          <Eye className="h-3.5 w-3.5" /> View Profile
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-destructive hover:text-destructive whitespace-nowrap"
                          disabled={unmatchingId === m.user_id}
                          onClick={() => handleUnmatch(m.user_id)}
                        >
                          <HeartOff className="h-3.5 w-3.5 flex-shrink-0" />
                          {unmatchingId === m.user_id ? "..." : "Not Interested"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* View Profile Dialog */}
      <Dialog open={!!selectedProfile} onOpenChange={(open) => !open && setSelectedProfile(null)}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-display)" }}>
              {selectedProfile?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedProfile && (
            <div className="space-y-4">
              <div className="aspect-square w-full overflow-hidden rounded-xl bg-muted">
                {getProfilePhotoUrl(selectedProfile.photo_url) ? (
                  <img
                    src={getProfilePhotoUrl(selectedProfile.photo_url)!}
                    alt={selectedProfile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-16 w-16 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-lg font-semibold">{selectedProfile.name}, {selectedProfile.age}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {selectedProfile.location}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" /> {selectedProfile.mobile}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" /> {selectedProfile.email}
                </div>
                <span className="inline-block rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                  {selectedProfile.gender}
                </span>
                {selectedProfile.bio && (
                  <p className="text-sm text-muted-foreground pt-2 border-t">{selectedProfile.bio}</p>
                )}
              </div>
              <Button
                variant="ghost"
                className="w-full gap-2 text-destructive hover:text-destructive"
                onClick={() => handleUnmatch(selectedProfile.user_id)}
                disabled={unmatchingId === selectedProfile.user_id}
              >
                <HeartOff className="h-4 w-4" />
                Not Interested Anymore
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Matches;
