import { supabase, MEDIA_BUCKET } from "../config/supabase";

export type MediaType = "image" | "video";

export interface SignedUploadResult {
  signedUrl: string;
  path: string;
  publicUrl: string;
}

export const getSignedUploadUrl = async (
  userId: string,
  fileName: string,
  mimeType: string,
): Promise<SignedUploadResult> => {
  const ext = fileName.split(".").pop();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(`Failed to create signed upload URL: ${error?.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(MEDIA_BUCKET)
    .getPublicUrl(path);

  return {
    signedUrl: data.signedUrl,
    path,
    publicUrl: urlData.publicUrl,
  };
};

export const getPublicUrl = (path: string): string => {
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

export const inferMediaType = (mimeType: string): MediaType => {
  if (mimeType.startsWith("video/")) return "video";
  return "image";
};
