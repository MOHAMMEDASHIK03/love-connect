import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import ProfileCard from "@/components/ProfileCard";
import { toast } from "sonner";
import { Heart } from "lucide-react";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [sentInterests, setSentInterests] = useState<Set<string>>(new Set());
  const [loadingInterest, setLoadingInterest] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [{ data: profilesData }, { data: interestsData }] = await Promise.all([
        supabase.from("profiles").select("*").neq("user_id", user.id),
        supabase.from("interests").select("to_user_id").eq("from_user_id", user.id),
      ]);
      setProfiles(profilesData || []);
      setSentInterests(new Set((interestsData || []).map((i) => i.to_user_id)));
    };

    fetchData();
  }, [user]);

  const handleInterested = async (toUserId: string) => {
    if (!user) return;
    setLoadingInterest(true);
    const { error } = await supabase.from("interests").insert({
      from_user_id: user.id,
      to_user_id: toUserId,
    });
    setLoadingInterest(false);
    if (error) {
      if (error.code === "23505") {
        toast.info("Interest already sent!");
      } else {
        toast.error(error.message);
      }
    } else {
      setSentInterests((prev) => new Set(prev).add(toUserId));
      toast.success("Interest sent! ❤️");
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Heart className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Discover Matches</h1>
          <p className="mt-1 text-muted-foreground">Browse profiles and send your interest</p>
        </div>
        {profiles.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <Heart className="mx-auto mb-4 h-12 w-12 text-primary/30" />
            <p>No profiles to show yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onInterested={handleInterested}
                alreadySent={sentInterests.has(profile.user_id)}
                loading={loadingInterest}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
