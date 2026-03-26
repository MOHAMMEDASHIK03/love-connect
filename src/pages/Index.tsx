import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import ProfileCard from "@/components/ProfileCard";
import { toast } from "sonner";
import { Heart, Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [sentInterests, setSentInterests] = useState<Set<string>>(new Set());
  const [loadingInterest, setLoadingInterest] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [ageRange, setAgeRange] = useState([18, 100]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ data: profilesData }, { data: interestsData }, { data: acceptedData }] = await Promise.all([
        supabase.from("profiles").select("*").neq("user_id", user.id),
        supabase.from("interests").select("to_user_id").eq("from_user_id", user.id),
        supabase.from("interests").select("from_user_id, to_user_id").eq("status", "accepted").or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`),
      ]);

      // Collect matched user IDs to hide from browse
      const matchedIds = new Set<string>();
      (acceptedData || []).forEach((i) => {
        matchedIds.add(i.from_user_id === user.id ? i.to_user_id : i.from_user_id);
      });

      setProfiles((profilesData || []).filter((p) => !matchedIds.has(p.user_id)));
      setSentInterests(new Set((interestsData || []).map((i) => i.to_user_id)));
    };
    fetchData();
  }, [user]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGender = genderFilter === "all" || p.gender === genderFilter;
      const matchesAge = p.age >= ageRange[0] && p.age <= ageRange[1];
      return matchesSearch && matchesGender && matchesAge;
    });
  }, [profiles, searchQuery, genderFilter, ageRange]);

  const handleInterested = async (toUserId: string) => {
    if (!user) return;
    setLoadingInterest(true);
    const { error } = await supabase.from("interests").insert({
      from_user_id: user.id,
      to_user_id: toUserId,
    });
    setLoadingInterest(false);
    if (error) {
      if (error.code === "23505") toast.info("Interest already sent!");
      else toast.error(error.message);
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
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Discover Matches</h1>
            <p className="mt-1 text-muted-foreground">Browse profiles and send your interest</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 self-start"
            onClick={() => setShowFilters((p) => !p)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {showFilters ? "Hide Filters" : "Filters"}
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or location..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Age Range: {ageRange[0]} – {ageRange[1]}</Label>
                <Slider
                  min={18}
                  max={100}
                  step={1}
                  value={ageRange}
                  onValueChange={setAgeRange}
                />
              </div>
            </div>
          )}
        </div>

        {filteredProfiles.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <Heart className="mx-auto mb-4 h-12 w-12 text-primary/30" />
            <p>{profiles.length === 0 ? "No profiles to show yet." : "No profiles match your filters."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredProfiles.map((profile) => (
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
