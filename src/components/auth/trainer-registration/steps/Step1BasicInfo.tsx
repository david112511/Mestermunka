
import { Input } from "@/components/ui/input";
import { Upload } from 'lucide-react';
import { FormContextProps } from '../types';
import { handleAvatarChange } from '../avatar-utils';
import { useToast } from "@/hooks/use-toast";

export const Step1BasicInfo = ({ 
  formData, 
  setFormData, 
  formErrors,
  avatarPreview, 
  setAvatarFile, 
  setAvatarPreview 
}: FormContextProps) => {
  const { toast } = useToast();

  return (
    <>
      <h3 className="text-lg font-semibold mb-4">Alapadatok</h3>
      <div className="space-y-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100">
            {avatarPreview ? (
              <img 
                src={avatarPreview} 
                alt="Avatar preview" 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  console.error("Error loading avatar preview");
                  e.currentTarget.src = "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300";
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Upload className="w-8 h-8" />
              </div>
            )}
          </div>
          <div className="w-full flex flex-col items-center">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleAvatarChange(e, setAvatarFile, setAvatarPreview, toast)}
              className="hidden"
              id="avatar-upload"
            />
            <label
              htmlFor="avatar-upload"
              className="cursor-pointer px-4 py-2 bg-gray-100 rounded-md text-sm text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Profilkép feltöltése
            </label>
            {avatarPreview && (
              <button
                type="button"
                onClick={() => {
                  setAvatarFile(null);
                  setAvatarPreview('');
                }}
                className="mt-2 text-xs text-red-500 hover:text-red-700"
              >
                Eltávolítás
              </button>
            )}
          </div>
        </div>
        <Input
          placeholder="Email cím"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        <Input
          placeholder="Jelszó"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />
        <Input
          placeholder="Vezetéknév"
          value={formData.lastName}
          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          required
        />
        <Input
          placeholder="Keresztnév"
          value={formData.firstName}
          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          required
        />
      </div>
    </>
  );
};
