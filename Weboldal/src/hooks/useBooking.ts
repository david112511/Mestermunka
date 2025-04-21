import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Booking, Service, TimeSlot, TrainerSettings } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { addMinutes, format, parseISO, getDay } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAppointments, TrainerAvailability } from '@/hooks/useAppointments';

/**
 * Hook a foglalási folyamat kezeléséhez
 */
export const useBooking = () => {
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [channels, setChannels] = useState<RealtimeChannel[]>([]);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { fetchTrainerAvailability } = useAppointments();
  
  // Leiratkozás a csatornákról a komponens eltávolításakor
  useEffect(() => {
    return () => {
      channels.forEach(channel => {
        channel.unsubscribe();
      });
    };
  }, [channels]);
  
  /**
   * Edző beállításainak lekérése
   */
  const getTrainerSettings = useCallback(async (trainerId: string): Promise<TrainerSettings | null> => {
    try {
      const { data, error } = await supabase
        .from('trainer_settings')
        .select('*')
        .eq('trainer_id', trainerId)
        .single();
      
      if (error) {
        // Ha nincs még beállítás, létrehozunk egy alapértelmezettet
        if (error.code === 'PGRST116') {
          return {
            id: '',
            trainer_id: trainerId,
            min_duration: 30,
            max_duration: 120,
            time_step: 15,
            confirmation_mode: 'manual',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
        throw error;
      }
      
      return data;
    } catch (err) {
      console.error('Hiba az edző beállításainak lekérésekor:', err);
      return null;
    }
  }, []);
  
  /**
   * Foglalt időpontok lekérése egy adott napra
   */
  const getBookedSlots = useCallback(async (trainerId: string, date: Date): Promise<Booking[]> => {
    try {
      // A nap kezdete és vége
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Lekérjük a foglalásokat
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('trainer_id', trainerId)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .neq('status', 'cancelled');
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (err) {
      console.error('Hiba a foglalt időpontok lekérésekor:', err);
      return [];
    }
  }, []);
  
  /**
   * Szabad időpontok generálása egy adott napra és szolgáltatásra
   */
  /**
   * Elérhető dátumok lekérése az edző elérhetőségei alapján
   */
  const getAvailableDates = useCallback(async (trainerId: string, startDate: Date, daysToCheck: number = 60) => {
    if (!trainerId) {
      toast({
        title: 'Hiba történt',
        description: 'Hiányzó edző azonosító.',
        variant: 'destructive',
      });
      return [];
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Lekérjük az edző elérhetőségeit
      const trainerAvailability = await fetchTrainerAvailability(trainerId);
      
      if (!trainerAvailability || trainerAvailability.length === 0) {
        toast({
          title: 'Nincs elérhető időpont',
          description: 'Az edző nem állított be elérhető időpontokat.',
          variant: 'destructive',
        });
        return [];
      }
      
      // Az edző mely napokon érhető el (0 = vasárnap, 1 = hétfő, stb.)
      const availableDays = new Set(trainerAvailability.map(a => a.day_of_week));
      
      // Generáljuk a lehetséges dátumokat
      const dates: Date[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < daysToCheck; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        date.setHours(0, 0, 0, 0);
        
        // Csak a jövőbeli dátumokat vesszük figyelembe
        if (date < today) continue;
        
        // Ellenőrizzük, hogy az edző elérhető-e ezen a napon
        const dayOfWeek = getDay(date); // 0 = vasárnap, 1 = hétfő, stb.
        
        if (availableDays.has(dayOfWeek)) {
          dates.push(date);
        }
      }
      
      setAvailableDates(dates);
      return dates;
    } catch (err) {
      console.error('Hiba az elérhető dátumok lekérésekor:', err);
      setError(err instanceof Error ? err : new Error('Ismeretlen hiba történt'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchTrainerAvailability, toast]);

  /**
   * Elérhető időpontok lekérése egy adott napra
   */
  const getAvailableSlots = useCallback(async (
    trainerId: string, 
    serviceId: string, 
    date: Date
  ) => {
    if (!trainerId || !serviceId) {
      toast({
        title: 'Hiba történt',
        description: 'Hiányzó edző vagy szolgáltatás azonosító.',
        variant: 'destructive',
      });
      return [];
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Lekérjük a szolgáltatás adatait
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();
      
      if (serviceError) {
        throw serviceError;
      }
      
      const service = serviceData as Service;
      
      // Lekérjük az edző beállításait
      const trainerSettings = await getTrainerSettings(trainerId);
      if (!trainerSettings) {
        throw new Error('Nem sikerült lekérni az edző beállításait.');
      }
      
      // Lekérjük az edző elérhetőségeit
      const trainerAvailability = await fetchTrainerAvailability(trainerId);
      
      if (!trainerAvailability || trainerAvailability.length === 0) {
        toast({
          title: 'Nincs elérhető időpont',
          description: 'Az edző nem állított be elérhető időpontokat.',
          variant: 'destructive',
        });
        return [];
      }
      
      // Lekérjük a foglalt időpontokat
      const bookedSlots = await getBookedSlots(trainerId, date);
      
      // Generáljuk a lehetséges időpontokat
      const timeSlots: TimeSlot[] = [];
      
      // A kiválasztott nap hét napja (0 = vasárnap, 1 = hétfő, stb.)
      const dayOfWeek = getDay(date);
      
      // Szűrjük az elérhetőségeket a kiválasztott napra
      const dayAvailability = trainerAvailability.filter(a => a.day_of_week === dayOfWeek);
      
      if (dayAvailability.length === 0) {
        return [];
      }
      
      // Minden elérhetőségi időszakra generáljuk az időpontokat
      for (const availability of dayAvailability) {
        // Kiszámoljuk a kezdő és befejező időpontokat
        const [startHour, startMinute] = availability.start_time.split(':').map(Number);
        const [endHour, endMinute] = availability.end_time.split(':').map(Number);
        
        const periodStart = new Date(date);
        periodStart.setHours(startHour, startMinute, 0, 0);
        
        const periodEnd = new Date(date);
        periodEnd.setHours(endHour, endMinute, 0, 0);
        
        // Időpontok generálása a time_step alapján
        let currentTime = new Date(periodStart);
        
        while (currentTime < periodEnd) {
          const slotStart = new Date(currentTime);
          const slotEnd = addMinutes(slotStart, service.duration);
          
          // Ellenőrizzük, hogy a slot vége nem haladja-e meg a periódus végét
          if (slotEnd > periodEnd) {
            break;
          }
          
          // Ellenőrizzük, hogy a slot nem ütközik-e foglalt időponttal
          const isAvailable = !bookedSlots.some(booking => {
            const bookingStart = parseISO(booking.start_time);
            const bookingEnd = parseISO(booking.end_time);
            
            // Ütközés ellenőrzése
            return (
              (slotStart >= bookingStart && slotStart < bookingEnd) || // A slot kezdete a foglalás ideje alatt van
              (slotEnd > bookingStart && slotEnd <= bookingEnd) || // A slot vége a foglalás ideje alatt van
              (slotStart <= bookingStart && slotEnd >= bookingEnd) // A slot teljesen magában foglalja a foglalást
            );
          });
          
          // Hozzáadjuk a szabad időpontot
          if (isAvailable) {
            timeSlots.push({
              start_time: slotStart.toISOString(),
              end_time: slotEnd.toISOString(),
              is_available: true
            });
          }
          
          // Léptetjük az időt a time_step alapján
          currentTime = addMinutes(currentTime, trainerSettings.time_step);
        }
      }
      
      setAvailableSlots(timeSlots);
      return timeSlots;
    } catch (err) {
      console.error('Hiba a szabad időpontok generálásakor:', err);
      setError(err instanceof Error ? err : new Error('Ismeretlen hiba történt'));
      
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült lekérni a szabad időpontokat.',
        variant: 'destructive',
      });
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [getTrainerSettings, getBookedSlots, toast]);
  
  /**
   * Foglalás létrehozása
   */
  const createBooking = useCallback(async (
    trainerId: string,
    serviceId: string,
    startTime: string,
    clientName: string,
    clientEmail: string,
    clientNote?: string
  ) => {
    if (!user) {
      toast({
        title: 'Bejelentkezés szükséges',
        description: 'A foglaláshoz be kell jelentkezned.',
        variant: 'destructive',
      });
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Lekérjük a szolgáltatás adatait
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();
      
      if (serviceError) {
        throw serviceError;
      }
      
      const service = serviceData as Service;
      
      // Kiszámoljuk a befejezési időpontot
      const startDate = parseISO(startTime);
      const endDate = addMinutes(startDate, service.duration);
      
      // Lekérjük az edző beállításait
      const trainerSettings = await getTrainerSettings(trainerId);
      
      // Meghatározzuk a foglalás státuszát
      const status = trainerSettings?.confirmation_mode === 'auto' ? 'confirmed' : 'pending';
      
      // Létrehozzuk a foglalást
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .insert([
          {
            trainer_id: trainerId,
            client_id: user.id,
            service_id: serviceId,
            title: `${clientName} - ${service.name}`,
            description: clientNote,
            start_time: startTime,
            end_time: endDate.toISOString(),
            status: status
          }
        ])
        .select()
        .single();
        
      if (appointmentError) {
        // Ha hiba történt, részletesen logoljuk
        console.error('Hiba a foglalás létrehozásakor:', appointmentError);
        throw appointmentError;
      }
      
      // Ha a foglalás automatikusan megerősítésre került, akkor létrehozunk egy értesítést
      // Megjegyzés: A manuális megerősítésnél a confirmBooking függvényben hozzuk létre az értesítést
      if (status === 'confirmed') {
        try {
          // Értesítés létrehozása az edző számára
          await supabase
            .from('notifications')
            .insert([
              {
                user_id: trainerId,
                type: 'appointment',
                content: `Új foglalás: ${clientName} - ${service.name} (${format(startDate, 'yyyy. MM. dd. HH:mm')})`,
                reference_id: appointmentData.id,
                reference_type: 'appointment',
                sender_id: user.id,
                is_read: false
              }
            ]);
            
          // Értesítés létrehozása a kliens számára
          await supabase
            .from('notifications')
            .insert([
              {
                user_id: user.id,
                type: 'appointment',
                content: `Foglalásod megerősítve: ${service.name} (${format(startDate, 'yyyy. MM. dd. HH:mm')})`,
                reference_id: appointmentData.id,
                reference_type: 'appointment',
                sender_id: trainerId,
                is_read: false
              }
            ]);
        } catch (notificationError) {
          console.error('Hiba az értesítés létrehozásakor:', notificationError);
          // Nem dobunk hibát, mert a foglalás létrehozása sikeres volt
        }
      }
      
      toast({
        title: status === 'confirmed' ? 'Foglalás megerősítve' : 'Foglalás folyamatban',
        description: status === 'confirmed' 
          ? `Sikeres foglalás: ${format(startDate, 'yyyy. MM. dd. HH:mm')}`
          : 'A foglalás létrejött, de még megerősítésre vár az edző részéről.',
        variant: 'default',
      });
      
      return appointmentData;
    } catch (err) {
      console.error('Hiba a foglalás létrehozásakor:', err);
      setError(err instanceof Error ? err : new Error('Ismeretlen hiba történt'));
      
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült létrehozni a foglalást.',
        variant: 'destructive',
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, getTrainerSettings, toast]);
  
  /**
   * Foglalás lemondása
   */
  const cancelBooking = useCallback(async (bookingId: string, cancellationReason?: string) => {
    if (!user) {
      toast({
        title: 'Bejelentkezés szükséges',
        description: 'A foglalás lemondásához be kell jelentkezned.',
        variant: 'destructive',
      });
      return false;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const now = new Date().toISOString();
      
      console.log('Foglalás lemondása kezdeményezve:', { bookingId, userId: user.id });
      
      // Ellenőrizzük, hogy a bookingId érvényes UUID-e
      if (!bookingId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) {
        console.error('Érvénytelen foglalás azonosító:', bookingId);
        throw new Error('Érvénytelen foglalás azonosító');
      }
      
      // Először lekérdezzük a foglalás adatait, hogy ellenőrizzük, a felhasználó jogosult-e a lemondásra
      const { data: bookingData, error: bookingError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', bookingId)
        .single();
      
      if (bookingError) {
        console.error('Hiba a foglalás adatainak lekérésekor:', bookingError);
        throw new Error('Nem sikerült lekérni a foglalás adatait: ' + bookingError.message);
      }
      
      if (!bookingData) {
        throw new Error('A foglalás nem található');
      }
      
      console.log('Foglalás adatai:', bookingData);
      
      // Ellenőrizzük, hogy a foglalás már nincs-e lemondva
      if (bookingData.status === 'cancelled') {
        console.error('Állapot hiba: A foglalás már le van mondva');
        throw new Error('Ez a foglalás már le van mondva');
      }
      
      // Ellenőrizzük, hogy a felhasználó jogosult-e a foglalás lemondására
      // A felhasználó akkor jogosult, ha ő a kliens vagy az edző
      if (bookingData.client_id !== user.id && bookingData.trainer_id !== user.id) {
        console.error('Jogosultsági hiba: A felhasználó sem nem kliens, sem nem edző', {
          userId: user.id,
          clientId: bookingData.client_id,
          trainerId: bookingData.trainer_id
        });
        throw new Error('Nincs jogosultságod a foglalás lemondásához');
      }
      
      // Használjuk az új cancel_booking függvényt
      const { data: cancelResult, error: cancelError } = await supabase
        .rpc('cancel_booking', { 
          booking_id: bookingId,
          reason: cancellationReason || null
        });
      
      if (cancelError) {
        console.error('Hiba a foglalás lemondásakor:', cancelError);
        throw cancelError;
      }
      
      if (!cancelResult) {
        throw new Error('A foglalás lemondása sikertelen volt');
      }
      
      // Töröljük a foglaláshoz kapcsolódó értesítéseket
      const { error: deleteNotificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('reference_id', bookingId)
        .eq('reference_type', 'appointment');
      
      if (deleteNotificationsError) {
        console.warn('Figyelmeztetés: Nem sikerült törölni a foglaláshoz kapcsolódó értesítéseket:', deleteNotificationsError);
        // Nem dobunk hibát, mert a foglalás lemondása sikeres volt
      } else {
        console.log('A foglaláshoz kapcsolódó értesítések sikeresen törölve');
      }
      
      console.log('Foglalás sikeresen lemondva:', { bookingId });
      
      // Frissítsük a helyi állapotot is, hogy azonnal látszódjon a változás
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking.id === bookingId 
            ? { 
                ...booking, 
                status: 'cancelled',
                cancellation_date: now,
                cancellation_reason: cancellationReason || null,
                updated_at: now
              } 
            : booking
        )
      );
      
      toast({
        title: 'Foglalás lemondva',
        description: 'A foglalás sikeresen lemondva.',
        variant: 'default',
      });
      
      return true;
    } catch (err) {
      console.error('Hiba a foglalás lemondásakor:', err);
      setError(err instanceof Error ? err : new Error('Ismeretlen hiba történt'));
      
      toast({
        title: 'Hiba történt',
        description: err instanceof Error ? err.message : 'Nem sikerült lemondani a foglalást.',
        variant: 'destructive',
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast, setBookings]);
  
  /**
   * Foglalás megerősítése (csak edzők számára)
   */
  const confirmBooking = useCallback(async (bookingId: string) => {
    if (!user) {
      toast({
        title: 'Bejelentkezés szükséges',
        description: 'A foglalás megerősítéséhez be kell jelentkezned.',
        variant: 'destructive',
      });
      return false;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Először ellenőrizzük, hogy a foglalás létezik-e és a felhasználó jogosult-e a megerősítésre
      const { data: bookingData, error: fetchError } = await supabase
        .from('appointments')
        .select('*, services(*)')
        .eq('id', bookingId)
        .single();
      
      if (fetchError) {
        console.error('Hiba a foglalás adatainak lekérésekor:', fetchError);
        throw new Error('Nem sikerült lekérni a foglalás adatait: ' + fetchError.message);
      }
      
      if (!bookingData) {
        throw new Error('A foglalás nem található');
      }
      
      // Ellenőrizzük, hogy a felhasználó jogosult-e a megerősítésre (ő-e az edző)
      if (bookingData.trainer_id !== user.id) {
        console.error('Jogosultsági hiba: A felhasználó nem az edző', {
          userId: user.id,
          trainerId: bookingData.trainer_id
        });
        throw new Error('Nincs jogosultságod a foglalás megerősítéséhez');
      }
      
      // Ellenőrizzük, hogy a foglalás függőben van-e
      if (bookingData.status !== 'pending') {
        console.error('Állapot hiba: A foglalás nem függőben van', {
          currentStatus: bookingData.status
        });
        throw new Error(`A foglalás nem megerősíthető, mert ${bookingData.status} állapotban van`);
      }
      
      // Megerősítjük a foglalást
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);
      
      if (error) {
        console.error('Hiba a foglalás megerősítésekor:', error);
        throw error;
      }
      
      // Lekérjük a kliens adatait, hogy a nevét használhassuk az értesítésben
      const { data: clientData, error: clientError } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', bookingData.client_id)
        .single();
      
      if (clientError) {
        console.error('Hiba a kliens adatainak lekérésekor:', clientError);
        // Nem dobunk hibát, mert a foglalás megerősítése sikeres volt
      }
      
      // Lekérjük a szolgáltatás adatait, ha nem sikerült a join
      let serviceName = '';
      if (bookingData.services && bookingData.services.name) {
        serviceName = bookingData.services.name;
      } else {
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('name')
          .eq('id', bookingData.service_id)
          .single();
        
        if (serviceError) {
          console.error('Hiba a szolgáltatás adatainak lekérésekor:', serviceError);
          // Nem dobunk hibát, mert a foglalás megerősítése sikeres volt
        } else if (serviceData) {
          serviceName = serviceData.name;
        }
      }
      
      // Létrehozzuk az értesítéseket a foglalás megerősítéséről
      try {
        const startDate = parseISO(bookingData.start_time);
        const clientName = clientData ? `${clientData.first_name} ${clientData.last_name}` : 'Kliens';
        
        // Értesítés létrehozása az edző számára
        await supabase
          .from('notifications')
          .insert([
            {
              user_id: user.id, // Az edző kap értesítést
              type: 'appointment',
              content: `Megerősítetted a foglalást: ${clientName} - ${serviceName} (${format(startDate, 'yyyy. MM. dd. HH:mm')})`,
              reference_id: bookingId,
              reference_type: 'appointment',
              sender_id: user.id, // Saját maga küldi
              is_read: false
            }
          ]);
          
        // Értesítés létrehozása a kliens számára
        await supabase
          .from('notifications')
          .insert([
            {
              user_id: bookingData.client_id, // A kliens kap értesítést
              type: 'appointment',
              content: `Foglalásod megerősítve: ${serviceName} (${format(startDate, 'yyyy. MM. dd. HH:mm')})`,
              reference_id: bookingId,
              reference_type: 'appointment',
              sender_id: user.id, // Az edző küldi
              is_read: false
            }
          ]);
      } catch (notificationError) {
        console.error('Hiba az értesítés létrehozásakor:', notificationError);
        // Nem dobunk hibát, mert a foglalás megerősítése sikeres volt
      }
      
      // Frissítjük a helyi állapotot
      setBookings(prev => 
        prev.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: 'confirmed', updated_at: new Date().toISOString() } 
            : booking
        )
      );
      
      toast({
        title: 'Foglalás megerősítve',
        description: 'A foglalás sikeresen megerősítve.',
        variant: 'default',
      });
      
      return true;
    } catch (err) {
      console.error('Hiba a foglalás megerősítésekor:', err);
      setError(err instanceof Error ? err : new Error('Ismeretlen hiba történt'));
      
      toast({
        title: 'Hiba történt',
        description: err instanceof Error ? err.message : 'Nem sikerült megerősíteni a foglalást.',
        variant: 'destructive',
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast, setBookings]);
  
  /**
   * Feliratkozás a foglalások változásaira
   */
  const subscribeToBookings = useCallback((callback: (bookings: Booking[]) => void) => {
    if (!user) return null;
    
    // Feliratkozás a saját foglalásokra (kliens)
    const clientChannel = supabase
      .channel(`client_bookings:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `client_id=eq.${user.id}`
        },
        async () => {
          const { data } = await supabase
            .from('appointments')
            .select('*')
            .eq('client_id', user.id)
            .order('created_at', { ascending: false });
          
          callback(data as Booking[] || []);
        }
      )
      .subscribe();
    
    // Feliratkozás az edzőként kapott foglalásokra
    const trainerChannel = supabase
      .channel(`trainer_bookings:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `trainer_id=eq.${user.id}`
        },
        async () => {
          const { data } = await supabase
            .from('appointments')
            .select('*')
            .eq('trainer_id', user.id)
            .order('created_at', { ascending: false });
          
          callback(data as Booking[] || []);
        }
      )
      .subscribe();
    
    setChannels(prev => [...prev, clientChannel, trainerChannel]);
    
    return [clientChannel, trainerChannel];
  }, [user]);
  
  /**
   * Foglalások lekérése
   */
  const getBookings = useCallback(async () => {
    if (!user) return [];
    
    try {
      setLoading(true);
      
      // Lekérjük a felhasználó foglalásait (mind kliens, mind edző szerepkörben)
      const { data: clientBookings } = await supabase
        .from('appointments')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });
      
      const { data: trainerBookings } = await supabase
        .from('appointments')
        .select('*')
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false });
      
      // Egyesítjük és eltávolítjuk a duplikátumokat
      const allBookings = [...(clientBookings || []), ...(trainerBookings || [])];
      const uniqueBookings = allBookings.filter((booking, index, self) =>
        index === self.findIndex((b) => b.id === booking.id)
      );
      
      setBookings(uniqueBookings as Booking[]);
      return uniqueBookings as Booking[];
    } catch (err) {
      console.error('Hiba a foglalások lekérésekor:', err);
      setError(err as Error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    availableSlots,
    availableDates,
    bookings,
    loading,
    error,
    getAvailableSlots,
    getAvailableDates,
    getBookings,
    createBooking,
    cancelBooking,
    confirmBooking,
    subscribeToBookings
  };
};
