
import { useState, useEffect } from 'react';
import { Coach } from '@/types/coach';
import { useToast } from "@/hooks/use-toast";
import { fetchTrainersWithDetails, fetchLocations } from '@/services/coachService';
import { transformTrainersToCoaches, createLocationMap } from '@/utils/coachDataTransformers';

export const useCoachData = () => {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCoaches = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch trainers with all their related data in one query
      const trainersData = await fetchTrainersWithDetails();
      
      // If we have trainers, process them
      if (trainersData && trainersData.length > 0) {
        // Fetch locations separately (they're not directly linked to trainers)
        const locations = await fetchLocations();
        
        // Create location lookup map
        const locationMap = createLocationMap(locations);
        
        // Transform raw trainer data into Coach objects
        const formattedCoaches = transformTrainersToCoaches(trainersData, locationMap);
        
        console.log('Formatted coaches with profile data:', formattedCoaches);
        setCoaches(formattedCoaches);
      } else {
        // No trainers found in database
        console.log('No trainers found in database');
        setCoaches([]);
      }
    } catch (error) {
      console.error('Hiba történt az edzők betöltésekor:', error);
      let errorMessage = 'Hiba történt az edzők betöltésekor';
      
      // Try to extract more specific error information if available
      if (error.message) {
        errorMessage += `: ${error.message}`;
      } else if (error.code) {
        errorMessage += ` (Kód: ${error.code})`;
      }
      
      setError(errorMessage);
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
