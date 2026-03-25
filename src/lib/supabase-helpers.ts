import { supabase } from "@/integrations/supabase/client";

export const getProfilePhotoUrl = (path: string | null) => {
  if (!path) return null;
  const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
  return data.publicUrl;
};

export const uploadProfilePhoto = async (userId: string, file: File) => {
  const ext = file.name.split(".").pop();
  const path = `${userId}/avatar.${ext}`;
  const { error } = await supabase.storage
    .from("profile-photos")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
};
