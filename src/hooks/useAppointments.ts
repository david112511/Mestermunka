import { useState, useEffect } from 'react';
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
  const { user } = useAuth();
  const { toast } = useToast();

  // Időpontfoglalások lekérése (saját foglalások vagy edzőként a hozzám tartozó foglalások)
  const fetchAppointments = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Lekérjük mind a kliensként, mind az edzőként hozzánk tartozó foglalásokat
      const { data: clientAppointments, error: clientError } = await supabase
        .from('appointments')
        .select(`
          *,
          trainer:users!appointments_trainer_id_fkey(id, email, full_name, avatar_url)
        `)
        .eq('client_id', user.id)
        .order('start_time', { ascending: true });

      if (clientError) {
        console.error('Hiba a kliens foglalások lekérésekor:', clientError);
        // Ha kapcsolati hiba van, ne próbáljuk meg a második lekérdezést
        if (clientError.message && clientError.message.includes('Failed to fetch')) {
          setLoading(false);
          return;
        }
        throw clientError;
      }

      const { data: trainerAppointments, error: trainerError } = await supabase
        .from('appointments')
        .select(`
          *,
          client:users!appointments_client_id_fkey(id, email, full_name, avatar_url)
        `)
        .eq('trainer_id', user.id)
        .order('start_time', { ascending: true });

      if (trainerError) {
        console.error('Hiba az edző foglalások lekérésekor:', trainerError);
        // Ha kapcsolati hiba van, használjuk csak a kliens foglalásokat
        if (trainerError.message && trainerError.message.includes('Failed to fetch')) {
          setAppointments(clientAppointments || []);
          setLoading(false);
          return;
        }
        throw trainerError;
      }

      // Összefűzzük a két listát
      const allAppointments = [
        ...clientAppointments.map(app => ({ ...app, isClient: true })),
        ...trainerAppointments.map(app => ({ ...app, isTrainer: true }))
      ];

      // Rendezzük időpont szerint
      allAppointments.sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      setAppointments(allAppointments);
    } catch (error) {
      console.error('Hiba a foglalások lekérésekor:', error);
      // Ne jelenítsünk meg toast üzenetet, ha kapcsolati hiba van
      if (error.message && !error.message.includes('Failed to fetch')) {
        toast({
          title: 'Hiba történt',
          description: 'Nem sikerült betölteni a foglalásokat.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Edző elérhetőségeinek lekérése
  const fetchTrainerAvailability = async (trainerId: string) => {
    try {
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
        throw error;
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
  };

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
  const setTrainerAvailabilityTimes = async (availabilityData: Omit<TrainerAvailability, 'id'>[]) => {
    if (!user) return false;

    try {
      // Először töröljük a meglévő elérhetőségeket
      const { error: deleteError } = await supabase
        .from('trainer_availability')
        .delete()
        .eq('trainer_id', user.id);

      if (deleteError) throw deleteError;

      // Majd beszúrjuk az újakat
      if (availabilityData.length > 0) {
        const { error: insertError } = await supabase
          .from('trainer_availability')
          .insert(availabilityData);

        if (insertError) throw insertError;
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
        description: 'Nem sikerült menteni az elérhetőségi időket.',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Automatikusan lekérjük a foglalásokat, amikor a komponens betöltődik
  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user]);

  return {
    loading,
    appointments,
    trainerAvailability,
    fetchAppointments,
    fetchTrainerAvailability,
    createAppointment,
    updateAppointmentStatus,
    setTrainerAvailabilityTimes,
  };
};
