import { supabase } from '@/lib/supabase';

/**
 * Fetches all trainer data with related information in a single query
 */
export const fetchTrainersWithDetails = async () => {
  console.log('Fetching trainers with all details...');
  
  // Let's add additional logging to troubleshoot the database connection
  try {
    // First, check if there are any trainers at all (simpler query)
    const { data: trainerCheck, error: checkError } = await supabase
      .from('trainers')
      .select('id')
      .limit(1);
      
    if (checkError) {
      console.error('Error checking if trainers exist:', checkError);
      throw checkError;
    }
    
    console.log('Trainer check result:', trainerCheck);
    
    if (!trainerCheck || trainerCheck.length === 0) {
      console.log('No trainers found in the database. The trainers table appears to be empty.');
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

    console.log('Number of trainers found:', trainers?.length || 0);
    
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
      
      console.log('Number of profiles found:', profilesData?.length || 0);
      
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
        console.log(`Profile data for trainer ${trainer.id}:`, trainer.profileData);
      }
    }
    
    console.log('Raw trainer data with related details:', trainers);
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
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === 'avatars');
    
    if (!bucketExists) {
      console.log("Creating 'avatars' storage bucket...");
      const { error } = await supabase.storage.createBucket('avatars', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
      });
      
      if (error) {
        console.error("Failed to create 'avatars' bucket:", error);
        throw error;
      }
      
      console.log("'avatars' bucket created successfully");
    } else {
      console.log("'avatars' bucket already exists");
    }
    
    return true;
  } catch (error) {
    console.error("Error ensuring avatars bucket exists:", error);
    return false;
  }
};
