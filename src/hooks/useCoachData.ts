
import { useState, useEffect } from 'react';
import { Coach } from '@/types/coach';
import { useToast } from "@/hooks/use-toast";
import * as coachService from '@/services/coachService';
import { 
  processSpecializationsData,
  processLanguagesData,
  processCertificationsData,
  processEducationData,
  processLocationsData,
  createProfilesMap,
  formatCoachData
} from '@/utils/coachDataTransformers';

export const useCoachData = () => {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCoaches = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch trainers data
      const trainers = await coachService.fetchTrainersData();

      if (!trainers || trainers.length === 0) {
        console.log('No trainers found');
        setCoaches([]);
        setLoading(false);
        return;
      }

      // Get trainer IDs for related data queries
      const trainerIds = trainers.map(trainer => trainer.id);
      
      // Fetch all related data
      const profilesData = await coachService.fetchTrainerProfiles(trainerIds);
      const specializationsData = await coachService.fetchTrainerSpecializations(trainerIds);
      const languagesData = await coachService.fetchTrainerLanguages(trainerIds);
      const certificationsData = await coachService.fetchTrainerCertifications(trainerIds);
      const educationData = await coachService.fetchTrainerEducation(trainerIds);
      
      // Get location IDs and fetch location data
      const locationIds = trainers
        .filter(trainer => trainer?.location)
        .map(trainer => trainer.location)
        .filter(loc => loc && loc.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i));
        
      const locations = await coachService.fetchLocations(locationIds as string[]);

      // Process all data into maps for easy access
      const profilesMap = createProfilesMap(profilesData);
      const specializationsMap = processSpecializationsData(specializationsData);
      const languagesMap = processLanguagesData(languagesData);
      const certificationsMap = processCertificationsData(certificationsData);
      const educationMap = processEducationData(educationData);
      const locationNames = processLocationsData(locations);

      // Format the data into Coach objects
      const formattedCoaches = formatCoachData(
        trainers,
        profilesMap,
        specializationsMap,
        languagesMap,
        certificationsMap,
        educationMap,
        locationNames
      );

      console.log('Formatted coaches:', formattedCoaches);
      setCoaches(formattedCoaches);
    } catch (error) {
      console.error('Hiba történt az edzők betöltésekor:', error);
      setError('Hiba történt az edzők betöltésekor');
      toast({
        title: "Hiba történt",
        description: "Nem sikerült betölteni az edzőket.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoaches();
  }, []);

  return { coaches, loading, error, fetchCoaches };
};
