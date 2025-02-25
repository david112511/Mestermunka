
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Upload } from 'lucide-react';

type RegistrationStep = 1 | 2 | 3 | 4 | 5;

interface PresetOption {
  id: string;
  name: string;
}

interface PresetOptions {
  specializations: PresetOption[];
  languages: PresetOption[];
  certifications: PresetOption[];
  educations: PresetOption[];
  locations: PresetOption[];
}

interface FormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  specializations: string[];
  price: string;
  experience: string;
  location: string;
  certifications: string[];
  availability: string;
  description: string;
  languages: string[];
  educations: string[];
  fullBio: string;
}

const initialFormData: FormData = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phone: '',
  specializations: [],
  price: '',
  experience: '',
  location: '',
  certifications: [],
  availability: '',
  description: '',
  languages: [],
  educations: [],
  fullBio: ''
};

export const TrainerRegistrationForm = () => {
  const [currentStep, setCurrentStep] = useState<RegistrationStep>(1);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const [presetOptions, setPresetOptions] = useState<PresetOptions>({
    specializations: [],
    languages: [],
    certifications: [],
    educations: [],
    locations: []
  });

  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPresetOptions = async () => {
      try {
        const [specializations, languages, certifications, educations, locations] = await Promise.all([
          supabase.from('specializations').select('id, name'),
          supabase.from('languages').select('id, name'),
          supabase.from('certifications').select('id, name'),
          supabase.from('education_types').select('id, name'),
          supabase.from('locations').select('id, name')
        ]);

        setPresetOptions({
          specializations: specializations.data || [],
          languages: languages.data || [],
          certifications: certifications.data || [],
          educations: educations.data || [],
          locations: locations.data || []
        });
      } catch (error) {
        console.error('Hiba történt az adatok betöltésekor:', error);
        toast({
          title: "Hiba történt",
          description: "Nem sikerült betölteni az adatokat. Kérjük, próbálja újra.",
          variant: "destructive",
        });
      }
    };

    fetchPresetOptions();
  }, [toast]);

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    let isValid = true;

    if (currentStep === 1) {
      if (!formData.email) {
        errors.email = 'Az email cím megadása kötelező';
        isValid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Érvénytelen email cím';
        isValid = false;
      }
      if (!formData.password || formData.password.length < 6) {
        errors.password = 'A jelszónak legalább 6 karakter hosszúnak kell lennie';
        isValid = false;
      }
      if (!formData.firstName) {
        errors.firstName = 'A keresztnév megadása kötelező';
        isValid = false;
      }
      if (!formData.lastName) {
        errors.lastName = 'A vezetéknév megadása kötelező';
        isValid = false;
      }
    }

    if (currentStep === 2) {
      if (formData.specializations.length === 0) {
        errors.specializations = 'Legalább egy szakterület választása kötelező';
        isValid = false;
      }
      if (!formData.price) {
        errors.price = 'Az óradíj megadása kötelező';
        isValid = false;
      }
      if (!formData.experience) {
        errors.experience = 'A tapasztalat megadása kötelező';
        isValid = false;
      }
    }

    if (currentStep === 3) {
      if (!formData.phone) {
        errors.phone = 'A telefonszám megadása kötelező';
        isValid = false;
      }
      if (!formData.location) {
        errors.location = 'A helyszín kiválasztása kötelező';
        isValid = false;
      }
      if (formData.languages.length === 0) {
        errors.languages = 'Legalább egy nyelv választása kötelező';
        isValid = false;
      }
    }

    if (currentStep === 4) {
      if (!formData.availability) {
        errors.availability = 'Az elérhetőség megadása kötelező';
        isValid = false;
      }
    }

    if (currentStep === 5) {
      if (!formData.description) {
        errors.description = 'A rövid leírás megadása kötelező';
        isValid = false;
      }
      if (!formData.fullBio) {
        errors.fullBio = 'A részletes bemutatkozás megadása kötelező';
        isValid = false;
      }
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (userId: string) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Hiba",
        description: "Kérjük, töltse ki a kötelező mezőket megfelelően",
        variant: "destructive",
      });
      return;
    }

    if (currentStep < 5) {
      setCurrentStep((prev) => (prev + 1) as RegistrationStep);
      return;
    }

    setLoading(true);
    try {
      // 1. Először regisztráljuk a felhasználót
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            user_type: 'trainer'
          }
        }
      });

      if (signUpError || !user) {
        throw signUpError || new Error('Nem sikerült létrehozni a felhasználót');
      }

      console.log("User created:", user.id);

      // 2. Létrehozzuk vagy frissítjük a trainer bejegyzést
      const trainerData = {
        id: user.id,
        price: formData.price,
        experience: formData.experience,
        location: formData.location,
        availability: formData.availability,
        description: formData.description,
        full_bio: formData.fullBio,
        rating: 0,
        reviews: 0,
        active_clients: 0,
        success_stories: 0
      };

      // Először megpróbáljuk frissíteni
      const { error: updateError } = await supabase
        .from('trainers')
        .upsert(trainerData);

      if (updateError) {
        console.error("Trainer creation/update error:", updateError);
        throw updateError;
      }

      console.log("Trainer created/updated");

      // 3. Frissítjük a profiles táblát
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          user_type: 'trainer'
        })
        .eq('id', user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
        throw profileError;
      }

      // 4. Feltöltjük az avatart, ha van
      let avatarUrl = null;
      if (avatarFile) {
        try {
          avatarUrl = await uploadAvatar(user.id);
          console.log("Avatar uploaded:", avatarUrl);
          
          // Ha sikerült az avatar feltöltése, frissítjük a profiles táblában
          if (avatarUrl) {
            const { error: avatarUpdateError } = await supabase
              .from('profiles')
              .update({ avatar_url: avatarUrl })
              .eq('id', user.id);

            if (avatarUpdateError) {
              console.error("Avatar URL update error:", avatarUpdateError);
            }
          }
        } catch (error) {
          console.error("Avatar upload error:", error);
          // Folytatjuk a regisztrációt, még ha a profilkép feltöltése nem is sikerült
        }
      }

      // 5. Létrehozzuk a kapcsolatokat
      const createRelations = async () => {
        const relations = [
          {
            table: 'trainer_specializations',
            values: formData.specializations,
            idField: 'specialization_id'
          },
          {
            table: 'trainer_languages',
            values: formData.languages,
            idField: 'language_id'
          },
          {
            table: 'trainer_certifications',
            values: formData.certifications,
            idField: 'certification_id'
          },
          {
            table: 'trainer_education',
            values: formData.educations,
            idField: 'education_id'
          }
        ];

        for (const relation of relations) {
          if (relation.values.length > 0) {
            // Először töröljük a meglévő kapcsolatokat
            const { error: deleteError } = await supabase
              .from(relation.table)
              .delete()
              .eq('trainer_id', user.id);

            if (deleteError) {
              console.error(`Error deleting existing ${relation.table}:`, deleteError);
              throw deleteError;
            }

            // Majd hozzáadjuk az újakat
            const { error } = await supabase
              .from(relation.table)
              .insert(
                relation.values.map(value => ({
                  trainer_id: user.id,
                  [relation.idField]: value
                }))
              );

            if (error) {
              console.error(`Error creating ${relation.table}:`, error);
              throw error;
            }
            console.log(`${relation.table} created`);
          }
        }
      };

      await createRelations();

      toast({
        title: "Sikeres regisztráció",
        description: "Kérjük, erősítse meg email címét a kiküldött linkkel.",
      });

      // Bezárjuk a regisztrációs ablakot és megnyitjuk a bejelentkezési ablakot
      const registerDialog = document.querySelector('[role="dialog"]');
      if (registerDialog) {
        const closeButton = registerDialog.querySelector('button[aria-label="Close"]');
        if (closeButton instanceof HTMLButtonElement) {
          closeButton.click();
        }
      }

      // Kis késleltetéssel megnyitjuk a login ablakot
      setTimeout(() => {
        const loginButton = document.querySelector('button:has(.lucide-user)');
        if (loginButton instanceof HTMLButtonElement) {
          loginButton.click();
        }
      }, 100);

    } catch (error: any) {
      console.error('Regisztrációs hiba:', error);
      toast({
        title: "Hiba történt",
        description: error.error_description || error.message || 'Hiba történt a regisztráció során',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderMultiSelect = (
    title: string,
    options: PresetOption[],
    selectedValues: string[],
    field: keyof typeof formData
  ) => {
    const handleSelect = (value: string) => {
      if (selectedValues.length >= 5 && !selectedValues.includes(value)) {
        toast({
          title: "Maximum 5 elem választható",
          description: "Kérjük, először távolítson el egy elemet, ha újat szeretne hozzáadni.",
          variant: "destructive",
        });
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        [field]: selectedValues.includes(value)
          ? selectedValues.filter(v => v !== value)
          : [...selectedValues, value]
      }));
    };

    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">{title}</label>
        <Select onValueChange={handleSelect}>
          <SelectTrigger>
            <SelectValue placeholder={`Válasszon ${title.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem
                key={option.id}
                value={option.id}
                disabled={selectedValues.length >= 5 && !selectedValues.includes(option.id)}
              >
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedValues.map((value) => {
            const option = options.find(o => o.id === value);
            if (!option) return null;
            return (
              <div
                key={value}
                className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-sm"
              >
                {option.name}
                <button
                  type="button"
                  onClick={() => handleSelect(value)}
                  className="hover:text-primary/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <h3 className="text-lg font-semibold mb-4">Alapadatok</h3>
            <div className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Upload className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  id="avatar-upload"
                />
                <label
                  htmlFor="avatar-upload"
                  className="cursor-pointer text-sm text-primary hover:text-primary/80"
                >
                  Profilkép feltöltése
                </label>
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
      case 2:
        return (
          <>
            <h3 className="text-lg font-semibold mb-4">Szakmai adatok</h3>
            <div className="space-y-4">
              {renderMultiSelect(
                "Szakterületek",
                presetOptions.specializations,
                formData.specializations,
                "specializations"
              )}
              <Input
                placeholder="Óradíj"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
              <Input
                placeholder="Tapasztalat (években)"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                required
              />
            </div>
          </>
        );
      case 3:
        return (
          <>
            <h3 className="text-lg font-semibold mb-4">Elérhetőség és nyelvtudás</h3>
            <div className="space-y-4">
              <Input
                placeholder="Telefonszám"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
              <Select onValueChange={(value) => setFormData({ ...formData, location: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon helyszínt" />
                </SelectTrigger>
                <SelectContent>
                  {presetOptions.locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {renderMultiSelect(
                "Beszélt nyelvek",
                presetOptions.languages,
                formData.languages,
                "languages"
              )}
            </div>
          </>
        );
      case 4:
        return (
          <>
            <h3 className="text-lg font-semibold mb-4">Képesítések</h3>
            <div className="space-y-4">
              {renderMultiSelect(
                "Végzettségek",
                presetOptions.educations,
                formData.educations,
                "educations"
              )}
              {renderMultiSelect(
                "Tanúsítványok",
                presetOptions.certifications,
                formData.certifications,
                "certifications"
              )}
              <Input
                placeholder="Elérhetőség (pl.: H-P 9-17)"
                value={formData.availability}
                onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                required
              />
            </div>
          </>
        );
      case 5:
        return (
          <>
            <h3 className="text-lg font-semibold mb-4">Bemutatkozás</h3>
            <div className="space-y-4">
              <Textarea
                placeholder="Rövid leírás"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
              <Textarea
                placeholder="Részletes bemutatkozás"
                value={formData.fullBio}
                onChange={(e) => setFormData({ ...formData, fullBio: e.target.value })}
                required
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-between mb-4">
        {[1, 2, 3, 4, 5].map((step) => (
          <div
            key={step}
            className={`h-2 w-1/6 rounded ${
              step <= currentStep ? 'bg-primary' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      
      {renderStep()}
      
      <div className="flex justify-between">
        {currentStep > 1 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep((prev) => (prev - 1) as RegistrationStep)}
          >
            Vissza
          </Button>
        )}
        <Button
          type="submit"
          className={currentStep === 1 ? 'w-full' : 'ml-auto'}
          disabled={loading}
        >
          {currentStep === 5
            ? loading ? 'Regisztráció...' : 'Regisztráció'
            : 'Következő'}
        </Button>
      </div>
    </form>
  );
};
