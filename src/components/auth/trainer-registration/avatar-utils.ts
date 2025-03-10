
import { supabase } from '@/lib/supabase';
import { ToastAction } from "@/components/ui/toast";
import { toast as toastFunction } from "@/components/ui/use-toast";

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

  const fileExt = avatarFile.name.split('.').pop();
  const filePath = `${userId}/avatar.${fileExt}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Hiba a profilkép feltöltése során:', error);
    throw error;
  }
};
