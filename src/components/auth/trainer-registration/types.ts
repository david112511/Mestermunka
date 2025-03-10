
import { Dispatch, SetStateAction } from 'react';

export type RegistrationStep = 1 | 2 | 3 | 4 | 5;

export interface PresetOption {
  id: string;
  name: string;
}

export interface PresetOptions {
  specializations: PresetOption[];
  languages: PresetOption[];
  certifications: PresetOption[];
  educations: PresetOption[];
  locations: PresetOption[];
}

export interface FormData {
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

export const initialFormData: FormData = {
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

export interface FormContextProps {
  formData: FormData;
  setFormData: Dispatch<SetStateAction<FormData>>;
  formErrors: Partial<Record<keyof FormData, string>>;
  avatarFile: File | null;
  avatarPreview: string;
  setAvatarFile: Dispatch<SetStateAction<File | null>>;
  setAvatarPreview: Dispatch<SetStateAction<string>>;
  presetOptions: PresetOptions;
}
