
import { FormData } from './types';

export const validateForm = (
  formData: FormData, 
  currentStep: number
): { isValid: boolean; errors: Partial<Record<keyof FormData, string>> } => {
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

  return { isValid, errors };
};
