
import { supabase } from '@/lib/supabase';

/**
 * Fetches trainers data from Supabase
 */
export const fetchTrainersData = async () => {
  console.log('Fetching trainers...');
  
  const { data: trainers, error: fetchError } = await supabase
    .from('trainers')
    .select(`
      id, 
      rating, 
      reviews, 
      price, 
      experience, 
      location, 
      availability, 
      active_clients, 
      success_stories, 
      description, 
      full_bio
    `);

  if (fetchError) {
    console.error('Error fetching trainers:', fetchError);
    throw fetchError;
  }

  console.log('Raw trainers data:', trainers);
  
  return trainers || [];
};

/**
 * Fetches profiles for the specified trainer IDs
 */
export const fetchTrainerProfiles = async (trainerIds: string[]) => {
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select(`
      id, 
      first_name, 
      last_name, 
      avatar_url
      `)
    .in('id', trainerIds);
  
  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  }
  
  console.log('Profiles data separately:', profilesData);
  return profilesData || [];
};

/**
 * Fetches specializations for the specified trainer IDs
 */
export const fetchTrainerSpecializations = async (trainerIds: string[]) => {
  const { data: specializationsData, error: specializationsError } = await supabase
    .from('trainer_specializations')
    .select(`
      trainer_id,
      specialization_id,
      specializations(name)
    `)
    .in('trainer_id', trainerIds);
    
  if (specializationsError) {
    console.error('Error fetching specializations:', specializationsError);
  }

  return specializationsData || [];
};

/**
 * Fetches languages for the specified trainer IDs
 */
export const fetchTrainerLanguages = async (trainerIds: string[]) => {
  const { data: languagesData, error: languagesError } = await supabase
    .from('trainer_languages')
    .select(`
      trainer_id,
      language_id,
      languages(name)
    `)
    .in('trainer_id', trainerIds);
    
  if (languagesError) {
    console.error('Error fetching languages:', languagesError);
  }

  return languagesData || [];
};

/**
 * Fetches certifications for the specified trainer IDs
 */
export const fetchTrainerCertifications = async (trainerIds: string[]) => {
  const { data: certificationsData, error: certificationsError } = await supabase
    .from('trainer_certifications')
    .select(`
      trainer_id,
      certification_id,
      certifications(name)
    `)
    .in('trainer_id', trainerIds);
    
  if (certificationsError) {
    console.error('Error fetching certifications:', certificationsError);
  }

  return certificationsData || [];
};

/**
 * Fetches education for the specified trainer IDs
 */
export const fetchTrainerEducation = async (trainerIds: string[]) => {
  const { data: educationData, error: educationError } = await supabase
    .from('trainer_education')
    .select(`
      trainer_id,
      education_id,
      education:education_types(name)
    `)
    .in('trainer_id', trainerIds);
    
  if (educationError) {
    console.error('Error fetching education:', educationError);
  }

  return educationData || [];
};

/**
 * Fetches locations for the specified location IDs
 */
export const fetchLocations = async (locationIds: string[]) => {
  if (!locationIds || locationIds.length === 0) {
    return [];
  }
  
  const { data: locations, error } = await supabase
    .from('locations')
    .select('id, name')
    .in('id', locationIds);
    
  if (error) {
    console.error('Error fetching locations:', error);
  }
    
  return locations || [];
};
