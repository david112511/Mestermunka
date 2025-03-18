import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export interface TrainerProfile {
  id: string;
  active_clients: number | null;
  availability: string | null;
  description: string | null;
  experience: string | null;
  full_bio: string | null;
  location: string | null;
  price: string | null;
  rating: number | null;
  reviews: number | null;
  success_stories: number | null;
  specializations: { id: string; name: string }[];
  certifications: { id: string; name: string }[];
  languages: { id: string; name: string }[];
  education: { id: string; name: string }[];
}

export const useTrainerProfile = () => {
  const { user } = useAuth();
  const [trainerProfile, setTrainerProfile] = useState<TrainerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTrainer, setIsTrainer] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshProfile = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Update specializations directly without full refresh
  const updateSpecializations = useCallback(async () => {
    if (!user || !trainerProfile) return;
    
    try {
      const { data: specializationsData, error: specializationsError } = await supabase
        .from('trainer_specializations')
        .select(`
          specialization_id,
          specializations (
            id,
            name
          )
        `)
        .eq('trainer_id', user.id);
        
      if (specializationsError) throw specializationsError;
      
      setTrainerProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          specializations: specializationsData.map((item: any) => ({
            id: item.specializations.id,
            name: item.specializations.name
          }))
        };
      });
    } catch (err) {
      console.error('Error updating specializations:', err);
    }
  }, [user, trainerProfile]);

  // Update certifications directly without full refresh
  const updateCertifications = useCallback(async () => {
    if (!user || !trainerProfile) return;
    
    try {
      const { data: certificationsData, error: certificationsError } = await supabase
        .from('trainer_certifications')
        .select(`
          certification_id,
          certifications (
            id,
            name
          )
        `)
        .eq('trainer_id', user.id);
        
      if (certificationsError) throw certificationsError;
      
      setTrainerProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          certifications: certificationsData.map((item: any) => ({
            id: item.certifications.id,
            name: item.certifications.name
          }))
        };
      });
    } catch (err) {
      console.error('Error updating certifications:', err);
    }
  }, [user, trainerProfile]);

  // Update languages directly without full refresh
  const updateLanguages = useCallback(async () => {
    if (!user || !trainerProfile) return;
    
    try {
      const { data: languagesData, error: languagesError } = await supabase
        .from('trainer_languages')
        .select(`
          language_id,
          languages (
            id,
            name
          )
        `)
        .eq('trainer_id', user.id);
        
      if (languagesError) throw languagesError;
      
      setTrainerProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          languages: languagesData.map((item: any) => ({
            id: item.languages.id,
            name: item.languages.name
          }))
        };
      });
    } catch (err) {
      console.error('Error updating languages:', err);
    }
  }, [user, trainerProfile]);

  // Update education directly without full refresh
  const updateEducation = useCallback(async () => {
    if (!user || !trainerProfile) return;
    
    try {
      const { data: educationData, error: educationError } = await supabase
        .from('trainer_education')
        .select(`
          education_id,
          education_types (
            id,
            name
          )
        `)
        .eq('trainer_id', user.id);
        
      if (educationError) throw educationError;
      
      setTrainerProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          education: educationData.map((item: any) => ({
            id: item.education_types.id,
            name: item.education_types.name
          }))
        };
      });
    } catch (err) {
      console.error('Error updating education:', err);
    }
  }, [user, trainerProfile]);

  // Update location directly without full refresh
  const updateLocation = useCallback(async (location: string) => {
    if (!user || !trainerProfile) return;
    
    setTrainerProfile(prev => {
      if (!prev) return null;
      return {
        ...prev,
        location
      };
    });
  }, [user, trainerProfile]);

  useEffect(() => {
    const fetchTrainerProfile = async () => {
      if (!user) {
        setTrainerProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // First check if user is a trainer
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();
          
        if (profileError) throw profileError;
        
        if (profileData?.user_type !== 'trainer') {
          setIsTrainer(false);
          setLoading(false);
          return;
        }
        
        setIsTrainer(true);
        
        // Fetch trainer basic data without trying to join with locations
        const { data: trainerData, error: trainerError } = await supabase
          .from('trainers')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (trainerError) throw trainerError;
        
        // Fetch specializations
        const { data: specializationsData, error: specializationsError } = await supabase
          .from('trainer_specializations')
          .select(`
            specialization_id,
            specializations (
              id,
              name
            )
          `)
          .eq('trainer_id', user.id);
          
        if (specializationsError) throw specializationsError;
        
        // Fetch certifications
        const { data: certificationsData, error: certificationsError } = await supabase
          .from('trainer_certifications')
          .select(`
            certification_id,
            certifications (
              id,
              name
            )
          `)
          .eq('trainer_id', user.id);
          
        if (certificationsError) throw certificationsError;
        
        // Fetch languages
        const { data: languagesData, error: languagesError } = await supabase
          .from('trainer_languages')
          .select(`
            language_id,
            languages (
              id,
              name
            )
          `)
          .eq('trainer_id', user.id);
          
        if (languagesError) throw languagesError;
        
        // Fetch education
        const { data: educationData, error: educationError } = await supabase
          .from('trainer_education')
          .select(`
            education_id,
            education_types (
              id,
              name
            )
          `)
          .eq('trainer_id', user.id);
          
        if (educationError) throw educationError;
        
        // Format the data
        const formattedTrainerProfile: TrainerProfile = {
          ...trainerData,
          specializations: specializationsData.map((item: any) => ({
            id: item.specializations.id,
            name: item.specializations.name
          })),
          certifications: certificationsData.map((item: any) => ({
            id: item.certifications.id,
            name: item.certifications.name
          })),
          languages: languagesData.map((item: any) => ({
            id: item.languages.id,
            name: item.languages.name
          })),
          education: educationData.map((item: any) => ({
            id: item.education_types.id,
            name: item.education_types.name
          }))
        };
        
        setTrainerProfile(formattedTrainerProfile);
      } catch (err: any) {
        console.error('Error fetching trainer profile:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrainerProfile();
  }, [user, refreshTrigger]);

  return { 
    trainerProfile, 
    loading, 
    error, 
    isTrainer, 
    refreshProfile,
    updateSpecializations,
    updateCertifications,
    updateLanguages,
    updateEducation,
    updateLocation,
    setTrainerProfile
  };
};
