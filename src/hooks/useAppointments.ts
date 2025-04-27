import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type AppointmentStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled';

export interface Appointment {
  id: string;
  client_id: string;
  trainer_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  status: AppointmentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  trainer?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface TrainerAvailability {
  id: string;
  trainer_id: string;
  day_of_week: number; // 0 (Sunday) to 6 (Saturday)
  start_time: string; // Format: 'HH:MM:SS'
  end_time: string; // Format: 'HH:MM:SS'
  is_available: boolean;
}

export interface AppointmentFormData {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  notes?: string;
}

export const useAppointments = () => {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [trainerAvailability, setTrainerAvailability] = useState<TrainerAvailability[]>([]);
  const [exceptionTableExists, setExceptionTableExists] = useState<boolean | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Időpontok lekérése
  const fetchAppointments = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log('Fetching appointments for user:', user.id);
      
      // Közvetlenül lekérjük az időpontokat, nem ellenőrizzük a felhasználói táblákat
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .or(`trainer_id.eq.${user.id},client_id.eq.${user.id}`);
      
      if (error) {
        console.error('Hiba az időpontok lekérésekor:', error);
        setAppointments([]);
        setLoading(false);
        return;
      }
      
      console.log('Appointments fetched with simple query:', data?.length || 0);
      setAppointments(data || []);
    } catch (error) {
      console.error('Hiba az időpontok lekérésekor:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [user, toast]);
  
  // Edző elérhetőségeinek lekérése
  const fetchTrainerAvailability = useCallback(async (trainerId: string) => {
    if (!trainerId) {
      console.error('Hiányzó trainerId a fetchTrainerAvailability hívásban');
      return [];
    }
    
    try {
      console.log('Fetching availability for trainer:', trainerId);
      
      // Ellenőrizzük, hogy a trainer_availability tábla létezik-e
      const { count, error: countError } = await supabase
        .from('trainer_availability')
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        console.error('Hiba a trainer_availability tábla ellenőrzésekor:', countError);
        if (countError.code === 'PGRST116') {
          console.error('A trainer_availability tábla nem létezik vagy nincs hozzáférésünk!');
          
          // Próbáljuk meg az availability táblát használni helyette
          console.log('Próbálkozás az availability táblával a trainer_availability helyett...');
          
          const { count: availabilityCount, error: availabilityCountError } = await supabase
            .from('availability')
            .select('*', { count: 'exact', head: true });
            
          if (availabilityCountError) {
            console.error('Hiba az availability tábla ellenőrzésekor is:', availabilityCountError);
            toast({
              title: 'Adatbázis hiba',
              description: 'Az elérhetőségi táblák nem érhetők el.',
              variant: 'destructive',
            });
            return [];
          }
          
          console.log('Availability tábla elérhető, használjuk azt a lekérdezésekhez');
          
          const { data: availabilityData, error: availabilityError } = await supabase
            .from('availability')
            .select('*')
            .eq('trainer_id', trainerId)
            .eq('is_available', true)
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true });
            
          if (availabilityError) {
            console.error('Hiba az elérhetőségek lekérésekor az availability táblából:', availabilityError);
            return [];
          }
          
          console.log(`Found ${availabilityData?.length || 0} availability records from availability table for trainer:`, trainerId);
          setTrainerAvailability(availabilityData || []);
          return availabilityData;
        }
        
        toast({
          title: 'Adatbázis hiba',
          description: 'Az edzői elérhetőségek tábla nem érhető el.',
          variant: 'destructive',
        });
        return [];
      }
      
      console.log('Trainer availability table check result:', { count });
      
      const { data, error } = await supabase
        .from('trainer_availability')
        .select('*')
        .eq('trainer_id', trainerId)
        .eq('is_available', true)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        // Ha kapcsolati hiba van, ne dobjunk hibát
        if (error.message && error.message.includes('Failed to fetch')) {
          console.error('Kapcsolati hiba az edző elérhetőségeinek lekérésekor:', error);
          return [];
        }
        console.error('Hiba az edző elérhetőségeinek lekérésekor:', error);
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} availability records for trainer:`, trainerId);
      
      if (data && data.length > 0) {
        console.log('Availability data sample:', data[0]);
      } else {
        console.log('No availability data found for trainer:', trainerId);
      }
      
      setTrainerAvailability(data || []);
      return data;
    } catch (error) {
      console.error('Hiba az edző elérhetőségeinek lekérésekor:', error);
      // Ne jelenítsünk meg toast üzenetet, ha kapcsolati hiba van
      if (error.message && !error.message.includes('Failed to fetch')) {
        toast({
          title: 'Hiba történt',
          description: 'Nem sikerült betölteni az edző elérhetőségeit.',
          variant: 'destructive',
        });
      }
      return [];
    }
  }, [toast]);

  // Új időpontfoglalás létrehozása
  const createAppointment = async (trainerId: string, formData: AppointmentFormData) => {
    if (!user) {
      toast({
        title: 'Nincs bejelentkezve',
        description: 'Az időpontfoglaláshoz be kell jelentkezni.',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const appointmentData = {
        client_id: user.id,
        trainer_id: trainerId,
        title: formData.title,
        description: formData.description || '',
        start_time: formData.start_time,
        end_time: formData.end_time,
        location: formData.location || '',
        notes: formData.notes || '',
        status: 'pending' as AppointmentStatus,
      };

      const { data, error } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sikeres foglalás',
        description: 'Az időpontfoglalás sikeresen elküldve. Az edző értesítést kap a foglalásról.',
      });

      // Frissítjük a foglalások listáját
      fetchAppointments();
      
      return data;
    } catch (error: any) {
      console.error('Hiba az időpontfoglalás létrehozásakor:', error);
      
      let errorMessage = 'Nem sikerült létrehozni a foglalást.';
      
      // Ellenőrizzük, hogy az adatbázis trigger hibája-e
      if (error.message && error.message.includes('Appointment time is outside of trainer availability')) {
        errorMessage = 'A választott időpont az edző elérhetőségi idején kívül esik.';
      } else if (error.message && error.message.includes('Appointment overlaps with an existing appointment')) {
        errorMessage = 'A választott időpont ütközik egy másik foglalással.';
      }
      
      toast({
        title: 'Hiba történt',
        description: errorMessage,
        variant: 'destructive',
      });
      
      return null;
    }
  };

  // Időpontfoglalás állapotának módosítása (elfogadás, elutasítás, lemondás)
  const updateAppointmentStatus = async (appointmentId: string, status: AppointmentStatus) => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;

      // Frissítjük a foglalások listáját
      fetchAppointments();
      
      let statusMessage = '';
      switch (status) {
        case 'confirmed':
          statusMessage = 'elfogadva';
          break;
        case 'rejected':
          statusMessage = 'elutasítva';
          break;
        case 'cancelled':
          statusMessage = 'lemondva';
          break;
        default:
          statusMessage = 'módosítva';
      }

      toast({
        title: 'Sikeres módosítás',
        description: `Az időpontfoglalás sikeresen ${statusMessage}.`,
      });

      return true;
    } catch (error) {
      console.error('Hiba az időpontfoglalás módosításakor:', error);
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült módosítani a foglalást.',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Edző elérhetőségeinek beállítása
  const setTrainerAvailabilityTimes = useCallback(async (availabilityData: Omit<TrainerAvailability, 'id'>[]) => {
    if (!user) return false;

    try {
      console.log('Setting trainer availability times for user:', user.id);
      console.log('Availability data to save:', availabilityData);
      
      // Ellenőrizzük, hogy a trainer_availability tábla létezik-e
      const { count, error: countError } = await supabase
        .from('trainer_availability')
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        console.error('Hiba a trainer_availability tábla ellenőrzésekor:', countError);
        if (countError.code === 'PGRST116') {
          console.error('A trainer_availability tábla nem létezik vagy nincs hozzáférésünk!');
          
          // Próbáljuk meg az availability táblát használni helyette
          console.log('Próbálkozás az availability táblával a trainer_availability helyett...');
          
          const { count: availabilityCount, error: availabilityCountError } = await supabase
            .from('availability')
            .select('*', { count: 'exact', head: true });
            
          if (availabilityCountError) {
            console.error('Hiba az availability tábla ellenőrzésekor is:', availabilityCountError);
            toast({
              title: 'Adatbázis hiba',
              description: 'Az elérhetőségi táblák nem érhetők el.',
              variant: 'destructive',
            });
            return false;
          }
          
          console.log('Availability tábla elérhető, használjuk azt a mentéshez');
          
          // Először töröljük a meglévő elérhetőségeket az availability táblából
          const { data: existingAvailabilityData, error: fetchAvailabilityError } = await supabase
            .from('availability')
            .select('*')
            .eq('trainer_id', user.id);
            
          if (fetchAvailabilityError) {
            console.error('Error fetching existing availability from availability table:', fetchAvailabilityError);
            throw fetchAvailabilityError;
          }
          
          console.log('Existing availability records in availability table:', existingAvailabilityData?.length || 0);
          
          // Csak akkor töröljük, ha vannak meglévő rekordok
          if (existingAvailabilityData && existingAvailabilityData.length > 0) {
            const { error: deleteAvailabilityError } = await supabase
              .from('availability')
              .delete()
              .eq('trainer_id', user.id);
    
            if (deleteAvailabilityError) {
              console.error('Error deleting existing availability from availability table:', deleteAvailabilityError);
              throw deleteAvailabilityError;
            }
            
            console.log('Successfully deleted existing availability records from availability table');
          }
    
          // Majd beszúrjuk az újakat az availability táblába
          if (availabilityData.length > 0) {
            // Ensure all records have the correct trainer_id
            const dataToInsert = availabilityData.map(item => ({
              ...item,
              trainer_id: user.id,
              // Ensure time format is correct (HH:MM:SS)
              start_time: item.start_time.includes(':00') ? item.start_time : `${item.start_time}:00`,
              end_time: item.end_time.includes(':00') ? item.end_time : `${item.end_time}:00`,
            }));
            
            console.log('Inserting new availability records to availability table:', dataToInsert);
            
            const { data: insertedAvailabilityData, error: insertAvailabilityError } = await supabase
              .from('availability')
              .insert(dataToInsert)
              .select();
    
            if (insertAvailabilityError) {
              console.error('Error inserting new availability to availability table:', insertAvailabilityError);
              throw insertAvailabilityError;
            }
            
            console.log('Successfully inserted new availability records to availability table:', insertedAvailabilityData?.length || 0);
          }
    
          // Verify the data was saved correctly
          const { data: verifyAvailabilityData, error: verifyAvailabilityError } = await supabase
            .from('availability')
            .select('*')
            .eq('trainer_id', user.id);
            
          if (verifyAvailabilityError) {
            console.error('Error verifying saved availability in availability table:', verifyAvailabilityError);
          } else {
            console.log('Verified saved availability records in availability table:', verifyAvailabilityData?.length || 0);
          }
    
          toast({
            title: 'Sikeres mentés',
            description: 'Az elérhetőségi idők sikeresen mentve.',
          });
    
          return true;
        }
        
        toast({
          title: 'Adatbázis hiba',
          description: 'Az edzői elérhetőségek tábla nem érhető el.',
          variant: 'destructive',
        });
        return false;
      }
      
      console.log('Trainer availability table check result:', { count });
      
      // Először töröljük a meglévő elérhetőségeket
      const { data: existingData, error: fetchError } = await supabase
        .from('trainer_availability')
        .select('*')
        .eq('trainer_id', user.id);
        
      if (fetchError) {
        console.error('Error fetching existing availability:', fetchError);
        throw fetchError;
      }
      
      console.log('Existing availability records:', existingData?.length || 0);
      
      // Csak akkor töröljük, ha vannak meglévő rekordok
      if (existingData && existingData.length > 0) {
        const { error: deleteError } = await supabase
          .from('trainer_availability')
          .delete()
          .eq('trainer_id', user.id);

        if (deleteError) {
          console.error('Error deleting existing availability:', deleteError);
          throw deleteError;
        }
        
        console.log('Successfully deleted existing availability records');
      }

      // Majd beszúrjuk az újakat
      if (availabilityData.length > 0) {
        // Ensure all records have the correct trainer_id
        const dataToInsert = availabilityData.map(item => ({
          ...item,
          trainer_id: user.id,
          // Ensure time format is correct (HH:MM:SS)
          start_time: item.start_time.includes(':00') ? item.start_time : `${item.start_time}:00`,
          end_time: item.end_time.includes(':00') ? item.end_time : `${item.end_time}:00`,
        }));
        
        console.log('Inserting new availability records:', dataToInsert);
        
        const { data: insertedData, error: insertError } = await supabase
          .from('trainer_availability')
          .insert(dataToInsert)
          .select();

        if (insertError) {
          console.error('Error inserting new availability:', insertError);
          throw insertError;
        }
        
        console.log('Successfully inserted new availability records:', insertedData?.length || 0);
      }

      // Verify the data was saved correctly
      const { data: verifyData, error: verifyError } = await supabase
        .from('trainer_availability')
        .select('*')
        .eq('trainer_id', user.id);
        
      if (verifyError) {
        console.error('Error verifying saved availability:', verifyError);
      } else {
        console.log('Verified saved availability records:', verifyData?.length || 0);
      }

      toast({
        title: 'Sikeres mentés',
        description: 'Az elérhetőségi idők sikeresen mentve.',
      });

      return true;
    } catch (error) {
      console.error('Hiba az elérhetőségi idők mentésekor:', error);
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült menteni az elérhetőségi időket. Részletek a konzolban.',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, toast]);

  // Egy adott nap egy adott időpontjának kivételként való kezelése (törlése)
  const addAvailabilityException = useCallback(async (
    trainerId: string, 
    date: Date, 
    slotId: string,
    startTime: string,
    endTime: string,
    dayOfWeek: number
  ) => {
    if (!trainerId) return false;

    // Ha már tudjuk, hogy a tábla nem létezik, ne próbáljuk meg lekérni
    if (exceptionTableExists === false) {
      // Használjuk a localStorage-ot
      const storageKey = `trainer_availability_exceptions_${trainerId}`;
      let existingExceptions = [];
      
      try {
        const storedExceptions = localStorage.getItem(storageKey);
        if (storedExceptions) {
          existingExceptions = JSON.parse(storedExceptions);
        }
      } catch (e) {
        // Csendben kezeljük a hibát
      }
      
      // Formázzuk az adott napot ISO formátumra (YYYY-MM-DD)
      const formattedDate = date.toISOString().split('T')[0];
      
      // Adjuk hozzá az új kivételt és mentsük
      existingExceptions.push({
        trainer_id: trainerId,
        exception_date: formattedDate,
        original_slot_id: slotId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        created_at: new Date().toISOString(),
        id: `local-${Date.now()}`  // Generáljunk egy ideiglenes ID-t
      });
      
      try {
        localStorage.setItem(storageKey, JSON.stringify(existingExceptions));
        toast({
          title: 'Időpont törölve',
          description: 'Az adott nap időpontja sikeresen törölve lett (helyi tárolás).',
        });
        return true;
      } catch (e) {
        // Csendben kezeljük a hibát
        toast({
          title: 'Hiba történt',
          description: 'Nem sikerült menteni a kivételt.',
          variant: 'destructive',
        });
        return false;
      }
    }

    try {
      // Formázzuk az adott napot ISO formátumra (YYYY-MM-DD)
      const formattedDate = date.toISOString().split('T')[0];
      
      // Adjuk hozzá a kivételt a táblához
      const exceptionData = {
        trainer_id: trainerId,
        exception_date: formattedDate,
        original_slot_id: slotId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        created_at: new Date().toISOString()
      };
      
      // Próbáljuk meg menteni a Supabase-be
      const { data, error } = await supabase
        .from('trainer_availability_exceptions')
        .insert(exceptionData)
        .select();
        
      if (error) {
        // Jelöljük, hogy a tábla nem létezik
        setExceptionTableExists(false);
        
        // Ha a tábla nem létezik vagy más hiba történt, használjunk localStorage-ot
        const storageKey = `trainer_availability_exceptions_${trainerId}`;
        let existingExceptions = [];
        
        try {
          const storedExceptions = localStorage.getItem(storageKey);
          if (storedExceptions) {
            existingExceptions = JSON.parse(storedExceptions);
          }
        } catch (e) {
          // Csendben kezeljük a hibát
        }
        
        // Adjuk hozzá az új kivételt és mentsük
        existingExceptions.push({
          ...exceptionData,
          id: `local-${Date.now()}`  // Generáljunk egy ideiglenes ID-t
        });
        
        try {
          localStorage.setItem(storageKey, JSON.stringify(existingExceptions));
          toast({
            title: 'Időpont törölve',
            description: 'Az adott nap időpontja sikeresen törölve lett (helyi tárolás).',
          });
          return true;
        } catch (e) {
          // Csendben kezeljük a hibát
          toast({
            title: 'Hiba történt',
            description: 'Nem sikerült menteni a kivételt.',
            variant: 'destructive',
          });
          return false;
        }
      }
      
      // Jelöljük, hogy a tábla létezik
      setExceptionTableExists(true);
      
      toast({
        title: 'Időpont törölve',
        description: 'Az adott nap időpontja sikeresen törölve lett.',
      });
      
      return true;
    } catch (error) {
      // Csendben kezeljük a hibát
      
      // Fallback localStorage-ra
      const storageKey = `trainer_availability_exceptions_${trainerId}`;
      let existingExceptions = [];
      
      try {
        const storedExceptions = localStorage.getItem(storageKey);
        if (storedExceptions) {
          existingExceptions = JSON.parse(storedExceptions);
        }
      } catch (e) {
        // Csendben kezeljük a hibát
      }
      
      // Formázzuk az adott napot ISO formátumra (YYYY-MM-DD)
      const formattedDate = date.toISOString().split('T')[0];
      
      // Adjuk hozzá az új kivételt és mentsük
      existingExceptions.push({
        trainer_id: trainerId,
        exception_date: formattedDate,
        original_slot_id: slotId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        created_at: new Date().toISOString(),
        id: `local-${Date.now()}`  // Generáljunk egy ideiglenes ID-t
      });
      
      try {
        localStorage.setItem(storageKey, JSON.stringify(existingExceptions));
        toast({
          title: 'Időpont törölve',
          description: 'Az adott nap időpontja sikeresen törölve lett (helyi tárolás).',
        });
        return true;
      } catch (e) {
        // Csendben kezeljük a hibát
        toast({
          title: 'Hiba történt',
          description: 'Nem sikerült menteni a kivételt.',
          variant: 'destructive',
        });
        return false;
      }
    }
  }, [toast, exceptionTableExists]);

  // Kivételek lekérése egy adott edzőhöz
  const fetchTrainerAvailabilityExceptions = useCallback(async (trainerId: string) => {
    // Ha már tudjuk, hogy a tábla nem létezik, ne próbáljuk meg lekérni
    if (exceptionTableExists === false) {
      // Használjuk a localStorage-ot
      const storageKey = `trainer_availability_exceptions_${trainerId}`;
      try {
        const storedExceptions = localStorage.getItem(storageKey);
        if (storedExceptions) {
          return JSON.parse(storedExceptions);
        }
      } catch (e) {
        // Csendben kezeljük a hibát
      }
      return [];
    }

    try {
      // Próbáljuk meg lekérni a kivételeket a Supabase-ből
      const { data, error } = await supabase
        .from('trainer_availability_exceptions')
        .select('*')
        .eq('trainer_id', trainerId);
        
      if (error) {
        // Jelöljük, hogy a tábla nem létezik
        setExceptionTableExists(false);
        
        // Ha a tábla nem létezik, olvassunk a localStorage-ból
        const storageKey = `trainer_availability_exceptions_${trainerId}`;
        try {
          const storedExceptions = localStorage.getItem(storageKey);
          if (storedExceptions) {
            return JSON.parse(storedExceptions);
          }
        } catch (e) {
          // Csendben kezeljük a hibát
        }
        return [];
      }
      
      // Jelöljük, hogy a tábla létezik
      setExceptionTableExists(true);
      return data || [];
    } catch (error) {
      // Csendben kezeljük a hibát
      
      // Fallback localStorage-ra
      const storageKey = `trainer_availability_exceptions_${trainerId}`;
      try {
        const storedExceptions = localStorage.getItem(storageKey);
        if (storedExceptions) {
          return JSON.parse(storedExceptions);
        }
      } catch (e) {
        // Csendben kezeljük a hibát
      }
      return [];
    }
  }, [exceptionTableExists]);

  // Ellenőrizzük, hogy egy adott időpont kivételként szerepel-e
  const isTimeSlotException = useCallback(async (trainerId: string, date: Date, slotId: string) => {
    try {
      const exceptions = await fetchTrainerAvailabilityExceptions(trainerId);
      const formattedDate = date.toISOString().split('T')[0];
      
      return exceptions.some(
        (exception) => 
          exception.exception_date === formattedDate && 
          exception.original_slot_id === slotId
      );
    } catch (error) {
      // Csendben kezeljük a hibát
      return false;
    }
  }, [fetchTrainerAvailabilityExceptions]);

  // Automatikusan lekérjük a foglalásokat, amikor a komponens betöltődik
  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user, fetchAppointments]);

  return {
    loading,
    appointments,
    trainerAvailability,
    fetchAppointments,
    fetchTrainerAvailability,
    createAppointment,
    updateAppointmentStatus,
    setTrainerAvailabilityTimes,
    addAvailabilityException,
    fetchTrainerAvailabilityExceptions,
    isTimeSlotException
  };
};
