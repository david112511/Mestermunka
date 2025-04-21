import { Coach } from '@/types/coach';

// Fallback images for missing profile pictures
const fallbackImages = [
  "https://images.unsplash.com/photo-1517365830460-955ce3ccd263?w=300",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300",
  "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=300",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300"
];

/**
 * Extracts an array of names from nested relations
 */
const extractNames = (relations: any): string[] => {
  if (!relations || !Array.isArray(relations)) return [];
  
  return relations.map(relation => {
    // Handle the nested object structure from Supabase joins
    const nestedObject = relation.specializations || relation.languages || 
                         relation.certifications || relation.education;
    
    return nestedObject && typeof nestedObject === 'object' && nestedObject.name || null;
  }).filter(Boolean);
};

/**
 * Creates a map of location IDs to names
 */
export const createLocationMap = (locations: any[]): Record<string, string> => {
  const locationMap = {};
  
  if (locations && Array.isArray(locations)) {
    locations.forEach(loc => {
      if (loc && loc.id && loc.name) {
        locationMap[loc.id] = loc.name;
      }
    });
  }
  
  return locationMap;
};

/**
 * Transforms the raw trainer data from Supabase into the Coach format
 * This function is important because it:
 * 1. Converts complex nested data from the database into a flat structure for the UI
 * 2. Handles missing data with sensible defaults
 * 3. Provides fallback images when profile images are missing
 * 4. Formats related data like specializations, languages, etc.
 */
export const transformTrainersToCoaches = (
  trainersData: any[],
  locationMap: Record<string, string>
): Coach[] => {
  if (!trainersData || !Array.isArray(trainersData)) return [];
  
  return trainersData.map(trainer => {
    // Get profile information from the profileData property
    let firstName = '';
    let lastName = '';
    let avatarUrl = null;
    
    // Check if profile data exists and extract the data
    if (trainer.profileData) {
      firstName = trainer.profileData.first_name || '';
      lastName = trainer.profileData.last_name || '';
      avatarUrl = trainer.profileData.avatar_url;
    }
    
    // Format name with fallback
    const fullName = `${lastName} ${firstName}`.trim();
    const displayName = fullName !== '' ? fullName : 'Teszt Edző';
    
    // Get avatar URL with fallback
    const displayAvatarUrl = avatarUrl || 
                     fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
    
    // Format location
    const locationDisplay = trainer.location && locationMap[trainer.location] 
                          ? locationMap[trainer.location] 
                          : (trainer.location || "Nem megadott");
    
    // Extract related data
    const specializations = extractNames(trainer.trainer_specializations);
    const languages = extractNames(trainer.trainer_languages);
    const certifications = extractNames(trainer.trainer_certifications);
    const education = extractNames(trainer.trainer_education);
    
    const coach = {
      id: trainer.id,
      name: displayName,
      specialty: specializations[0] || 'Általános edző',
      rating: trainer.rating || 0,
      reviews: trainer.reviews || 0,
      image: displayAvatarUrl,
      price: trainer.price || "0",
      experience: trainer.experience || "0",
      location: locationDisplay,
      certifications: certifications,
      availability: trainer.availability || "Nem megadott",
      activeClients: trainer.active_clients || 0,
      successStories: trainer.success_stories || 0,
      description: trainer.description || "Nincs megadott leírás",
      languages: languages,
      email: "", // Email címet nem jelenítünk meg biztonsági okokból
      phone: "", // Telefonszámot nem jelenítünk meg biztonsági okokból
      specializationAreas: specializations,
      education: education,
      fullBio: trainer.full_bio || "Nincs megadott részletes leírás"
    };
    
    return coach;
  });
};
