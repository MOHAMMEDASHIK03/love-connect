import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MapPin, User } from "lucide-react";
import { getProfilePhotoUrl } from "@/lib/supabase-helpers";

interface ProfileCardProps {
  profile: {
    id: string;
    name: string;
    age: number;
    gender: string;
    location: string;
    photo_url: string | null;
    user_id: string;
  };
  onInterested: (toUserId: string) => void;
  alreadySent: boolean;
  loading: boolean;
}

const ProfileCard = ({ profile, onInterested, alreadySent, loading }: ProfileCardProps) => {
  const photoUrl = getProfilePhotoUrl(profile.photo_url);

  return (
    <Card className="overflow-hidden shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-1">
      <div className="aspect-[4/5] overflow-hidden bg-muted">
        {photoUrl ? (
          <img src={photoUrl} alt={profile.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-16 w-16 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          {profile.name}, {profile.age}
        </h3>
        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {profile.location}
        </div>
        <span className="mt-1 inline-block rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
          {profile.gender}
        </span>
        <Button
          className="mt-3 w-full gap-2 gradient-warm border-0"
          disabled={alreadySent || loading}
          onClick={() => onInterested(profile.user_id)}
        >
          <Heart className="h-4 w-4" />
          {alreadySent ? "Interest Sent" : "❤️ Interested"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProfileCard;
