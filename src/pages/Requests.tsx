import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProfilePhotoUrl } from "@/lib/supabase-helpers";
import { Check, X, Heart, User, MapPin } from "lucide-react";
import { toast } from "sonner";

interface RequestWithProfile {
  id: string;
  from_user_id: string;
  status: string;
  created_at: string;
  profile: {
    name: string;
    age: number;
    gender: string;
    location: string;
    photo_url: string | null;
  } | null;
}

const Requests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("interests")
      .select("id, from_user_id, status, created_at")
      .eq("to_user_id", user.id)
      .order("created_at", { ascending: false });

    if (!data) {
      setLoading(false);
      return;
    }

    const fromUserIds = data.map((r) => r.from_user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, age, gender, location, photo_url")
      .in("user_id", fromUserIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

    setRequests(
      data.map((r) => ({
        ...r,
        profile: profileMap.get(r.from_user_id) || null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const handleAction = async (requestId: string, status: "accepted" | "rejected") => {
    const { error } = await supabase
      .from("interests")
      .update({ status })
      .eq("id", requestId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(status === "accepted" ? "Match accepted! 🎉" : "Request declined");
      fetchRequests();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Interest Requests</h1>
          <p className="mt-1 text-muted-foreground">People who are interested in you</p>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Heart className="mx-auto h-8 w-8 animate-pulse text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <Heart className="mx-auto mb-4 h-12 w-12 text-primary/30" />
            <p>No incoming requests yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const photoUrl = getProfilePhotoUrl(req.profile?.photo_url ?? null);
              return (
                <Card key={req.id} className="shadow-card">
                  <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                        {photoUrl ? (
                          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <User className="h-7 w-7 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 sm:hidden">
                        <h3 className="font-semibold text-lg truncate" style={{ fontFamily: "var(--font-display)" }}>
                          {req.profile?.name ?? "Unknown"}, {req.profile?.age}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{req.profile?.location}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{req.profile?.gender}</span>
                      </div>
                    </div>
                    <div className="hidden sm:block flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate" style={{ fontFamily: "var(--font-display)" }}>
                        {req.profile?.name ?? "Unknown"}, {req.profile?.age}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{req.profile?.location}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{req.profile?.gender}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                      {req.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            className="gap-1 gradient-warm border-0 flex-1 sm:flex-none"
                            onClick={() => handleAction(req.id, "accepted")}
                          >
                            <Check className="h-4 w-4" /> Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 flex-1 sm:flex-none"
                            onClick={() => handleAction(req.id, "rejected")}
                          >
                            <X className="h-4 w-4" /> Reject
                          </Button>
                        </>
                      ) : (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            req.status === "accepted"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {req.status === "accepted" ? "Accepted ✓" : "Rejected"}
                        </span>
                      )}
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

export default Requests;
