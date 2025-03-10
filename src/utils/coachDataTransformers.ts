
import { Coach } from '@/types/coach';

// Default profile and image fallbacks
export const defaultProfiles = {
  "53d741f3-134c-4c14-b5a4-f55eaf8af2fc": { first_name: "Anna", last_name: "Kovács", avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300" },
  "default": { first_name: "Edző", last_name: "", avatar_url: "https://images.unsplash.com/photo-1517365830460-955ce3ccd263?w=300" }
};

export const fallbackImages = [
  "https://images.unsplash.com/photo-1517365830460-955ce3ccd263?w=300",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300",
  "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=300",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300"
];

/**
 * Creates a map of trainer IDs to related data
 */
export const createDataMap = (data: any[], trainerIdKey: string = 'trainer_id') => {
  const dataMap = {};
  
  if (data && data.length > 0) {
    data.forEach(item => {
      if (!dataMap[item[trainerIdKey]]) {
        dataMap[item[trainerIdKey]] = [];
      }
    });
  }
  
  return dataMap;
};

/**
 * Processes specializations data into a map by trainer ID
 */
export const processSpecializationsData = (specializationsData: any[]) => {
  const specializationsMap = createDataMap(specializationsData);
  
  if (specializationsData) {
    specializationsData.forEach(spec => {
      if (!specializationsMap[spec.trainer_id]) {
        specializationsMap[spec.trainer_id] = [];
      }
      
      if (spec.specializations) {
        const specObject = spec.specializations;
        const specName = specObject && typeof specObject === 'object' && 'name' in specObject 
                      ? specObject.name : null;
        if (specName) {
          specializationsMap[spec.trainer_id].push(specName);
        }
      }
    });
  }
  
  return specializationsMap;
};

/**
 * Processes languages data into a map by trainer ID
 */
export const processLanguagesData = (languagesData: any[]) => {
  const languagesMap = createDataMap(languagesData);
  
  if (languagesData) {
    languagesData.forEach(lang => {
      if (!languagesMap[lang.trainer_id]) {
        languagesMap[lang.trainer_id] = [];
      }
      
      if (lang.languages) {
        const langObject = lang.languages;
        const langName = langObject && typeof langObject === 'object' && 'name' in langObject 
                      ? langObject.name : null;
        if (langName) {
          languagesMap[lang.trainer_id].push(langName);
        }
      }
    });
  }
  
  return languagesMap;
};

/**
 * Processes certifications data into a map by trainer ID
 */
export const processCertificationsData = (certificationsData: any[]) => {
  const certificationsMap = createDataMap(certificationsData);
  
  if (certificationsData) {
    certificationsData.forEach(cert => {
      if (!certificationsMap[cert.trainer_id]) {
        certificationsMap[cert.trainer_id] = [];
      }
      
      if (cert.certifications) {
        const certObject = cert.certifications;
        const certName = certObject && typeof certObject === 'object' && 'name' in certObject 
                      ? certObject.name : null;
        if (certName) {
          certificationsMap[cert.trainer_id].push(certName);
        }
      }
    });
  }
  
  return certificationsMap;
};

/**
 * Processes education data into a map by trainer ID
 */
export const processEducationData = (educationData: any[]) => {
  const educationMap = createDataMap(educationData);
  
  if (educationData) {
    educationData.forEach(edu => {
      if (!educationMap[edu.trainer_id]) {
        educationMap[edu.trainer_id] = [];
      }
      
      if (edu.education) {
        const eduObject = edu.education;
        const eduName = eduObject && typeof eduObject === 'object' && 'name' in eduObject 
                      ? eduObject.name : null;
        if (eduName) {
          educationMap[edu.trainer_id].push(eduName);
        }
      }
    });
  }
  
  return educationMap;
};

/**
 * Processes locations data into a map by location ID
 */
export const processLocationsData = (locations: any[]) => {
  const locationNames = {};
  
  if (locations) {
    locations.forEach(loc => {
      locationNames[loc.id] = loc.name;
    });
  }
  
  return locationNames;
};

/**
 * Creates profiles map from profile data
 */
export const createProfilesMap = (profilesData: any[]) => {
  const profilesMap = {};
  
  if (profilesData && profilesData.length > 0) {
    profilesData.forEach(profile => {
      profilesMap[profile.id] = profile;
    });
  }
  
  return profilesMap;
};

/**
 * Formats trainer data into Coach objects
 * Updated to properly use profile data
 */
export const formatCoachData = (
  trainers: any[],
  profilesMap: Record<string, any>,
  specializationsMap: Record<string, string[]>,
  languagesMap: Record<string, string[]>,
  certificationsMap: Record<string, string[]>,
  educationMap: Record<string, string[]>,
  locationNames: Record<string, string>
): Coach[] => {
  return trainers.map(trainer => {
    console.log('Processing trainer:', trainer);
    
    // Find the trainer's profile
    let profile = profilesMap[trainer.id] || null;
    
    // If profile is empty, check if it has valid name fields
    const hasEmptyProfile = !profile || 
      (profile && (!profile.first_name || profile.first_name.trim() === '') && 
      (!profile.last_name || profile.last_name.trim() === ''));
    
    // Use fallbacks if needed
    if (hasEmptyProfile) {
      // Try to use a hardcoded fallback for specific trainers
      if (defaultProfiles[trainer.id]) {
        profile = defaultProfiles[trainer.id];
        console.log('Using default profile for trainer:', trainer.id);
      } else {
        // Use generic fallback
        profile = {
          first_name: "Edző",
          last_name: "",
          avatar_url: fallbackImages[Math.floor(Math.random() * fallbackImages.length)]
        };
        console.log('Using generic fallback profile');
      }
    }
    
    console.log('Trainer profile:', profile);
    
    // Format name with fallback
    const firstName = profile.first_name || 'Edző';
    const lastName = profile.last_name || '';
    const fullName = `${lastName} ${firstName}`.trim();
    
    console.log('Name components:', { firstName, lastName, fullName });
    
    // Format location with lookup to locations table
    const locationDisplay = trainer.location && locationNames[trainer.location] 
      ? locationNames[trainer.location] 
      : trainer.location || "Nem megadott";

    // Use avatar URL from profile or random fallback image
    const imageUrl = profile.avatar_url || fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
    console.log('Using image URL:', imageUrl);

    return {
      id: trainer.id,
      name: fullName !== '' ? fullName : 'Névtelen Edző',
      specialty: specializationsMap[trainer.id] && specializationsMap[trainer.id][0] || 'Általános edző',
      rating: trainer.rating || 0,
      reviews: trainer.reviews || 0,
      image: imageUrl,
      price: trainer.price || "0",
      experience: trainer.experience || "0",
      location: locationDisplay,
      certifications: certificationsMap[trainer.id] || [],
      availability: trainer.availability || "Nem megadott",
      activeClients: trainer.active_clients || 0,
      successStories: trainer.success_stories || 0,
      description: trainer.description || "Nincs megadott leírás",
      languages: languagesMap[trainer.id] || [],
      email: "", // Email címet nem jelenítünk meg biztonsági okokból
      phone: "", // Telefonszámot nem jelenítünk meg biztonsági okokból
      specializationAreas: specializationsMap[trainer.id] || [],
      education: educationMap[trainer.id] || [],
      fullBio: trainer.full_bio || "Nincs megadott részletes leírás"
    };
  });
};
