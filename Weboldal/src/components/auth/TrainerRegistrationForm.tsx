
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { 
  FormData, 
  initialFormData, 
  PresetOptions, 
  RegistrationStep 
} from './trainer-registration/types';
import { validateForm } from './trainer-registration/validation';
import { submitRegistration } from './trainer-registration/submit-registration';
import { RegistrationStepper } from './trainer-registration/RegistrationStepper';
import { Step1BasicInfo } from './trainer-registration/steps/Step1BasicInfo';
import { Step2ProfessionalInfo } from './trainer-registration/steps/Step2ProfessionalInfo';
import { Step3ContactInfo } from './trainer-registration/steps/Step3ContactInfo';
import { Step4Qualifications } from './trainer-registration/steps/Step4Qualifications';
import { Step5Biography } from './trainer-registration/steps/Step5Biography';

export const TrainerRegistrationForm = () => {
  const [currentStep, setCurrentStep] = useState<RegistrationStep>(1);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);

  const [presetOptions, setPresetOptions] = useState<PresetOptions>({
    specializations: [],
    languages: [],
    certifications: [],
    educations: [],
    locations: []
  });

  const { toast } = useToast();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { isValid, errors } = validateForm(formData, currentStep);
    setFormErrors(errors);

    if (!isValid) {
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
      await submitRegistration(formData, avatarFile);
      
      toast({
        title: "Sikeres regisztráció",
        description: "Kérjük, erősítse meg email címét a kiküldött linkkel.",
      });

      // Close registration dialog and open login dialog
      const registerDialog = document.querySelector('[role="dialog"]');
      if (registerDialog) {
        const closeButton = registerDialog.querySelector('button[aria-label="Close"]');
        if (closeButton instanceof HTMLButtonElement) {
          closeButton.click();
        }
      }

      // Open login dialog after a short delay
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

  const renderStep = () => {
    const formContextProps = {
      formData,
      setFormData,
      formErrors,
      avatarFile,
      setAvatarFile,
      avatarPreview,
      setAvatarPreview,
      presetOptions
    };

    switch (currentStep) {
      case 1:
        return <Step1BasicInfo {...formContextProps} />;
      case 2:
        return <Step2ProfessionalInfo {...formContextProps} />;
      case 3:
        return <Step3ContactInfo {...formContextProps} />;
      case 4:
        return <Step4Qualifications {...formContextProps} />;
      case 5:
        return <Step5Biography {...formContextProps} />;
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <RegistrationStepper currentStep={currentStep} />
      
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
