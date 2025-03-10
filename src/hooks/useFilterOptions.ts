
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface FilterOptionsList {
  specializations: string[];
  languageOptions: string[];
  experienceOptions: { value: string; label: string; }[];
  certificationOptions: string[];
  educationOptions: string[];
  locationOptions: string[];
}

export const useFilterOptions = () => {
  const [filterOptions, setFilterOptions] = useState<FilterOptionsList>({
    specializations: [],
    languageOptions: [],
    experienceOptions: [
      { value: "0-2", label: "0-2 év" },
      { value: "3-5", label: "3-5 év" },
      { value: "5-10", label: "5-10 év" },
      { value: "10+", label: "10+ év" }
    ],
    certificationOptions: [],
    educationOptions: [],
    locationOptions: []
  });

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

        setFilterOptions({
          ...filterOptions,
          specializations: specializations.data?.map(s => s.name) || [],
          languageOptions: languages.data?.map(l => l.name) || [],
          certificationOptions: certifications.data?.map(c => c.name) || [],
          educationOptions: educations.data?.map(e => e.name) || [],
          locationOptions: locations.data?.map(l => l.name) || []
        });
      } catch (error) {
        console.error('Hiba történt az adatok betöltésekor:', error);
      }
    };

    fetchPresetOptions();
  }, []);

  return filterOptions;
};
