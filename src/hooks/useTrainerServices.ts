import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Service } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook az edzők szolgáltatásainak kezeléséhez
 * @param trainerId - Az edző azonosítója (opcionális, ha nincs megadva, akkor a bejelentkezett felhasználó azonosítóját használja)
 */
export const useTrainerServices = (trainerId?: string) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Ha nincs megadva trainerId, akkor a bejelentkezett felhasználó azonosítóját használjuk
  const effectiveTrainerId = trainerId || user?.id;
  
  /**
   * Szolgáltatások lekérése
   */
  const fetchServices = useCallback(async () => {
    if (!effectiveTrainerId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('trainer_id', effectiveTrainerId)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setServices(data || []);
    } catch (err) {
      console.error('Hiba a szolgáltatások lekérésekor:', err);
      setError(err instanceof Error ? err : new Error('Ismeretlen hiba történt'));
      
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült lekérni a szolgáltatásokat.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [effectiveTrainerId, toast]);
  
  /**
   * Új szolgáltatás hozzáadása
   */
  const addService = useCallback(async (serviceData: Omit<Service, 'id' | 'trainer_id' | 'created_at' | 'updated_at'>) => {
    if (!effectiveTrainerId) {
      toast({
        title: 'Hiba történt',
        description: 'Nincs bejelentkezett felhasználó vagy nem adtál meg edző azonosítót.',
        variant: 'destructive',
      });
      return null;
    }
    
    try {
      setError(null);
      
      const { data, error } = await supabase
        .from('services')
        .insert([
          {
            ...serviceData,
            trainer_id: effectiveTrainerId
          }
        ])
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Frissítjük a szolgáltatások listáját
      setServices(prevServices => [data, ...prevServices]);
      
      toast({
        title: 'Szolgáltatás létrehozva',
        description: `A(z) "${serviceData.name}" szolgáltatás sikeresen létrehozva.`,
        variant: 'default',
      });
      
      return data;
    } catch (err) {
      console.error('Hiba a szolgáltatás létrehozásakor:', err);
      setError(err instanceof Error ? err : new Error('Ismeretlen hiba történt'));
      
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült létrehozni a szolgáltatást.',
        variant: 'destructive',
      });
      
      return null;
    }
  }, [effectiveTrainerId, toast]);
  
  /**
   * Szolgáltatás frissítése
   */
  const updateService = useCallback(async (
    serviceId: string, 
    serviceData: Partial<Omit<Service, 'id' | 'trainer_id' | 'created_at' | 'updated_at'>>
  ) => {
    if (!effectiveTrainerId) {
      toast({
        title: 'Hiba történt',
        description: 'Nincs bejelentkezett felhasználó vagy nem adtál meg edző azonosítót.',
        variant: 'destructive',
      });
      return false;
    }
    
    try {
      setError(null);
      
      const { data, error } = await supabase
        .from('services')
        .update(serviceData)
        .eq('id', serviceId)
        .eq('trainer_id', effectiveTrainerId)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Frissítjük a szolgáltatások listáját
      setServices(prevServices => 
        prevServices.map(service => 
          service.id === serviceId ? { ...service, ...data } : service
        )
      );
      
      toast({
        title: 'Szolgáltatás frissítve',
        description: 'A szolgáltatás adatai sikeresen frissítve.',
        variant: 'default',
      });
      
      return true;
    } catch (err) {
      console.error('Hiba a szolgáltatás frissítésekor:', err);
      setError(err instanceof Error ? err : new Error('Ismeretlen hiba történt'));
      
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült frissíteni a szolgáltatást.',
        variant: 'destructive',
      });
      
      return false;
    }
  }, [effectiveTrainerId, toast]);
  
  /**
   * Szolgáltatás törlése
   */
  const deleteService = useCallback(async (serviceId: string) => {
    if (!effectiveTrainerId) {
      toast({
        title: 'Hiba történt',
        description: 'Nincs bejelentkezett felhasználó vagy nem adtál meg edző azonosítót.',
        variant: 'destructive',
      });
      return false;
    }
    
    try {
      setError(null);
      
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId)
        .eq('trainer_id', effectiveTrainerId);
      
      if (error) {
        throw error;
      }
      
      // Frissítjük a szolgáltatások listáját
      setServices(prevServices => 
        prevServices.filter(service => service.id !== serviceId)
      );
      
      toast({
        title: 'Szolgáltatás törölve',
        description: 'A szolgáltatás sikeresen törölve.',
        variant: 'default',
      });
      
      return true;
    } catch (err) {
      console.error('Hiba a szolgáltatás törlésekor:', err);
      setError(err instanceof Error ? err : new Error('Ismeretlen hiba történt'));
      
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült törölni a szolgáltatást.',
        variant: 'destructive',
      });
      
      return false;
    }
  }, [effectiveTrainerId, toast]);
  
  // Szolgáltatások lekérése a komponens betöltésekor
  useEffect(() => {
    fetchServices();
  }, [fetchServices]);
  
  return {
    services,
    loading,
    error,
    fetchServices,
    addService,
    updateService,
    deleteService
  };
};
