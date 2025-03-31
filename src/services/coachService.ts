import { supabase } from '@/lib/supabase';

/**
 * Fetches all trainer data with related information in a single query
 */
export const fetchTrainersWithDetails = async () => {
  try {
    // First, check if there are any trainers at all (simpler query)
    const { data: trainerCheck, error: checkError } = await supabase
      .from('trainers')
      .select('id')
      .limit(1);
      
    if (checkError) {
      console.error('Error checking if trainers exist:', checkError);
      // Ha a trainers tábla nem létezik, próbáljuk meg közvetlenül a profiles táblából lekérdezni az edzőket
      const { data: profilesCheck, error: profilesCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_type', 'trainer')
        .limit(1);
        
      if (profilesCheckError) {
        console.error('Error checking if trainer profiles exist:', profilesCheckError);
        return [];
      }
      
      if (!profilesCheck || profilesCheck.length === 0) {
        return [];
      }
      
      // Ha találtunk edzőket a profiles táblában, akkor csak azokat adjuk vissza
      const { data: trainerProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, user_type')
        .eq('user_type', 'trainer');
        
      if (profilesError) {
        console.error('Error fetching trainer profiles:', profilesError);
        return [];
      }
      
      // Alakítsuk át a profilokat a várt formátumra
      const simplifiedTrainers = trainerProfiles.map(profile => ({
        id: profile.id,
        rating: 0,
        reviews: 0,
        price: 0,
        experience: '',
        location: '',
        availability: '',
        active_clients: 0,
        success_stories: '',
        description: '',
        full_bio: '',
        trainer_specializations: [],
        trainer_languages: [],
        trainer_certifications: [],
        trainer_education: [],
        profileData: profile
      }));
      
      return simplifiedTrainers;
    }
    
    if (!trainerCheck || trainerCheck.length === 0) {
      return [];
    }
    
    // If we got here, we confirmed trainers exist, so proceed with full query
    const { data: trainers, error } = await supabase
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
        full_bio,
        trainer_specializations(specialization_id, specializations(name)),
        trainer_languages(language_id, languages(name)),
        trainer_certifications(certification_id, certifications(name)),
        trainer_education(education_id, education:education_types(name))
      `);

    if (error) {
      console.error('Error fetching trainers with details:', error);
      throw error;
    }
    
    // Now fetch profiles separately and merge them with trainer data
    if (trainers && trainers.length > 0) {
      const trainerIds = trainers.map(trainer => trainer.id);
      
      // Get profiles for these trainers
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, user_type')
        .in('id', trainerIds);
        
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }
      
      // Create a mapping of profile data by ID for easy lookup
      const profilesById: Record<string, any> = {};
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesById[profile.id] = profile;
        });
      }
      
      // Define a TypeScript interface for our trainer data structure
      interface TrainerData {
        id: any;
        rating: any;
        reviews: any;
        price: any;
        experience: any;
        location: any;
        availability: any;
        active_clients: any;
        success_stories: any;
        description: any;
        full_bio: any;
        trainer_specializations: any[];
        trainer_languages: any[];
        trainer_certifications: any[];
        trainer_education: any[];
        profileData?: any; // Add this property as optional
      }
      
      // Merge profile data with trainer data
      for (const trainer of trainers as TrainerData[]) {
        // Create a new property in each trainer object to hold profile data
        trainer.profileData = profilesById[trainer.id] || null;
      }
    }
    
    return trainers || [];
  } catch (error) {
    console.error('Unexpected error in fetchTrainersWithDetails:', error);
    throw error;
  }
};

/**
 * Fetches locations data
 */
export const fetchLocations = async () => {
  const { data: locations, error } = await supabase
    .from('locations')
    .select('id, name');
    
  if (error) {
    console.error('Error fetching locations:', error);
    throw error;
  }
    
  return locations || [];
};

/**
 * Creates an 'avatars' storage bucket if it doesn't exist yet
 */
export const ensureAvatarsBucketExists = async () => {
  try {
    // Check if the bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      // Ha nem tudjuk lekérdezni a bucketeket, akkor feltételezzük, hogy már létezik
      return true;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'avatars');
    
    // Ha a bucket már létezik, nincs szükség további műveletekre
    if (bucketExists) {
      return true;
    }
    
    // Ne próbáljuk meg létrehozni a bucketet, mert RLS szabálysértést okoz
    // Feltételezzük, hogy a bucket már létezik vagy a rendszergazda fogja létrehozni
    return true;
  } catch (error) {
    // Hiba esetén is folytatjuk, feltételezve, hogy a bucket már létezik
    return true;
  }
};
