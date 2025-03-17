
import { supabase } from '@/lib/supabase';
import { ToastAction } from "@/components/ui/toast";
import { toast as toastFunction } from "@/components/ui/use-toast";
import { ensureAvatarsBucketExists } from '@/services/coachService';

export const handleAvatarChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  setAvatarFile: (file: File | null) => void,
  setAvatarPreview: (url: string) => void,
  toast: typeof toastFunction
) => {
  const file = e.target.files?.[0];
  if (file) {
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "Hiba",
        description: "A fájl mérete nem lehet nagyobb 5MB-nál",
        variant: "destructive",
      });
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Hiba",
        description: "Csak képfájlok tölthetők fel",
        variant: "destructive",
      });
      return;
    }

    setAvatarFile(file);
    
    // Create URL for image preview
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    
    console.log("Avatar preview URL created:", objectUrl);
  }
};

export const uploadAvatar = async (userId: string, avatarFile: File | null): Promise<string | null> => {
  if (!avatarFile) return null;

  console.log("Starting avatar upload for user:", userId);
  
  try {
    // First ensure the avatars bucket exists
    await ensureAvatarsBucketExists();
    
    // Ensure the correct content type is set
    const contentType = avatarFile.type;
    
    // Create a unique filename with timestamp to avoid cache issues
    const timestamp = new Date().getTime();
    const fileExt = avatarFile.name.split('.').pop();
    const filePath = `${userId}/avatar-${timestamp}.${fileExt}`;
    
    console.log("Uploading to path:", filePath, "with content type:", contentType);

    // Upload the avatar to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile, {
        cacheControl: '3600',
        contentType: contentType,
        upsert: true
      });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      throw uploadError;
    }

    console.log("Upload successful, data:", data);

    // Get the public URL for the uploaded avatar
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
      
    console.log("Avatar upload successful, public URL:", publicUrl);

    return publicUrl;
  } catch (error) {
    console.error('Error during avatar upload:', error);
    throw error;
  }
};
