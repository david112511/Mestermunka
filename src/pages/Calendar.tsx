import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, addHours, startOfWeek, endOfWeek, addDays, subDays } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, Users, MapPin, Dumbbell, X, Edit, Trash2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'react-router-dom';
import TrainerAvailabilityCalendar from '@/components/TrainerAvailabilityCalendar';
import { Switch } from "@/components/ui/switch";
import RecurringEventDialog from '@/components/RecurringEventDialog';
import WeekView from '@/components/WeekView';
import DayView from '@/components/DayView';
import MonthView from '@/components/MonthView';

// Esemény típusok
type EventType = 'personal' | 'training' | 'group';

// Esemény interfész
interface Event {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  type: EventType;
  is_recurring?: boolean;
}

// Naptár oldal komponens
const CalendarPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAvailability, setShowAvailability] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [showAddEventDialog, setShowAddEventDialog] = useState(false);
  const [showEventDetailsDialog, setShowEventDetailsDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeView, setActiveView] = useState<'month' | 'week' | 'day'>('month');
  const [loading, setLoading] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [recurringDialogAction, setRecurringDialogAction] = useState<'delete' | 'edit'>('delete');
  const [recurringActionCallback, setRecurringActionCallback] = useState<(deleteAll: boolean) => void>(() => () => {});
  
  // Új esemény alapértelmezett értékei
  const [newEvent, setNewEvent] = useState<Omit<Event, 'id'>>({
    title: '',
    description: '',
    start_time: format(new Date().setHours(9, 0, 0, 0), "yyyy-MM-dd'T'HH:mm"),
    end_time: format(new Date().setHours(10, 0, 0, 0), "yyyy-MM-dd'T'HH:mm"),
    location: '',
    type: 'personal'
  });

  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();

  // Az URL paraméterek alapján állítjuk be, hogy az elérhetőségi beállításokat vagy a naptárat jelenítsük meg
  useEffect(() => {
    const availabilityParam = searchParams.get('availability');
    setShowAvailability(availabilityParam === 'true');
  }, [searchParams]);

  // Váltás a naptár és az elérhetőségi beállítások között
  const toggleAvailabilityView = () => {
    const newValue = !showAvailability;
    setShowAvailability(newValue);
    
    // URL paraméter frissítése
    if (newValue) {
      searchParams.set('availability', 'true');
    } else {
      searchParams.delete('availability');
    }
    setSearchParams(searchParams);
  };

  // Ha a felhasználó nem edző, akkor nem jelenítjük meg az elérhetőségi beállításokat
  useEffect(() => {
    if (showAvailability && profile && !profile.is_trainer) {
      toast({
        title: 'Nincs jogosultságod',
        description: 'Az elérhetőségi beállítások csak edzők számára érhetők el.',
        variant: 'destructive',
      });
      setShowAvailability(false);
      searchParams.delete('availability');
      setSearchParams(searchParams);
    }
  }, [profile, showAvailability, searchParams, setSearchParams, toast]);

 // Események betöltése
useEffect(() => {
  const fetchEvents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Lekérdezzük az időpontfoglalásokat a Supabase adatbázisból
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          title,
          description,
          start_time,
          end_time,
          location,
          status,
          is_recurring,
          trainer_id,
          client_id
        `)
        .or(`trainer_id.eq.${user.id},client_id.eq.${user.id}`);
      
      if (appointmentsError) {
        console.error('Hiba történt az időpontok lekérésekor:', appointmentsError);
        toast({
          title: 'Hiba történt',
          description: 'Nem sikerült betölteni az időpontokat.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      
      // Lekérdezzük az eseményeket a Supabase adatbázisból
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          start_time,
          end_time,
          location,
          is_recurring,
          user_id,
          client_id,
          event_type
        `)
        .or(`user_id.eq.${user.id},client_id.eq.${user.id}`);
      
      if (eventsError) {
        console.error('Hiba történt az események lekérésekor:', eventsError);
        toast({
          title: 'Hiba történt',
          description: 'Nem sikerült betölteni az eseményeket.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      
      // Átalakítjuk az időpontfoglalásokat a megfelelő formátumra
      const formattedAppointments: Event[] = appointmentsData.map((appointment: any) => {
        // Meghatározzuk az esemény típusát
        let eventType: EventType = 'personal';
        if (appointment.trainer_id === user.id) {
          eventType = 'training'; // Ha edző vagyok, akkor edzés típusú
        } else if (appointment.client_id === user.id) {
          eventType = 'personal'; // Ha kliens vagyok, akkor személyes típusú
        }
        
        // Létrehozzuk az esemény objektumot
        return {
          id: appointment.id,
          title: appointment.title || 'Időpontfoglalás',
          description: appointment.description || '',
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          location: appointment.location || '',
          type: eventType,
          is_recurring: appointment.is_recurring || false
        };
      });
      
      // Átalakítjuk az eseményeket a megfelelő formátumra
      const formattedEvents: Event[] = eventsData.map((event: any) => {
        // Létrehozzuk az esemény objektumot
        return {
          id: event.id,
          title: event.title || 'Esemény',
          description: event.description || '',
          start_time: event.start_time,
          end_time: event.end_time,
          location: event.location || '',
          type: event.event_type as EventType || 'personal',
          is_recurring: event.is_recurring || false
        };
      });
      
      // Ha van ismétlődő esemény, akkor generáljuk le a következő 12 hétre
      const allEvents: Event[] = [...formattedAppointments, ...formattedEvents];
      const recurringEvents: Event[] = [];
      
      // Az ismétlődő események kezelése
      allEvents.forEach(event => {
        if (event.is_recurring) {
          // Az eredeti esemény hozzáadása
          recurringEvents.push(event);
          
          // Generáljuk le a következő 12 heti eseményt
          for (let i = 1; i <= 12; i++) {
            const startTime = new Date(event.start_time);
            const endTime = new Date(event.end_time);
            
            // Hozzáadunk i hetet az időpontokhoz
            startTime.setDate(startTime.getDate() + (i * 7));
            endTime.setDate(endTime.getDate() + (i * 7));
            
            // Létrehozzuk az új eseményt
            recurringEvents.push({
              ...event,
              id: `${event.id}-recurring-${i}`,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              title: `${event.title} (ismétlődő)`
            });
          }
        } else {
          // Nem ismétlődő esemény, egyszerűen hozzáadjuk
          recurringEvents.push(event);
        }
      });
  
      console.log('Betöltött események:', recurringEvents);
      setEvents(recurringEvents);
      setLoading(false);
    } catch (error) {
      console.error('Hiba történt az események betöltése közben:', error);
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült betölteni az eseményeket.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };
  fetchEvents();
}, [user, toast]);

  // Új esemény hozzáadása
  const handleAddEvent = async () => {
    if (!user) return;
    
    // Ellenőrizzük, hogy a profil betöltődött-e
    if (!profile) {
      toast({
        title: 'Hiba történt',
        description: 'A felhasználói profil nem érhető el. Kérjük, próbáld újra később.',
        variant: 'destructive',
      });
      return;
    }
    
    // Biztosítsuk, hogy a client_id mindig ki legyen töltve
    const isTrainer = !!profile.is_trainer;
    const trainerId = isTrainer ? user.id : null;
    const clientId = user.id;

    try {
      console.log('Esemény hozzáadása:', {
        title: newEvent.title,
        is_recurring: isRecurring,
        trainer_id: trainerId,
        client_id: clientId,
        user_id: user.id,
        is_trainer: isTrainer
      });
      
      // Generáljunk új egyedi azonosítót az eseménynek
      const eventId = crypto.randomUUID();

      // Közvetlenül az events táblába szúrjuk be az adatokat
      // Csak a biztosan létező mezőket használjuk
      const { data, error } = await supabase
      .from('events')
      .insert([
        {
          title: newEvent.title,
          description: newEvent.description,
          start_time: newEvent.start_time,
          end_time: newEvent.end_time,
          location: newEvent.location,
          is_recurring: isRecurring,
          user_id: user.id, // A létrehozó felhasználó azonosítója
          client_id: isTrainer ? clientId : user.id, // Ha edző vagyok, akkor a kiválasztott kliens, egyébként én magam
          event_type: newEvent.type // Az esemény típusa (personal, training, group)
        }
      ])
      .select();
  
      if (error) {
        console.error('Hiba történt az esemény hozzáadása közben:', error);
        toast({
          title: 'Hiba történt',
          description: `Nem sikerült hozzáadni az eseményt: ${error.message}`,
          variant: 'destructive',
        });
        return;
      }
      
      // Frissítjük a helyi állapotot az új eseménnyel
    const newEventWithId: Event = {
      ...newEvent,
      id: data[0].id,
      is_recurring: isRecurring
    };

    setEvents([...events, newEventWithId]);
    setShowAddEventDialog(false);
    resetNewEvent();

    toast({
      title: 'Esemény hozzáadva',
      description: `Az esemény sikeresen hozzá lett adva a naptárhoz${isRecurring ? ' (heti ismétlődéssel)' : ''}.`,
    });
  } catch (error) {
    console.error('Hiba történt az esemény hozzáadása közben:', error);
    toast({
      title: 'Hiba történt',
      description: 'Nem sikerült hozzáadni az eseményt.',
      variant: 'destructive',
    });
  }
};
  

  // Esemény törlése
const handleDeleteEvent = async (deleteAll = false) => {
  if (!selectedEvent) return;

  // Ellenőrizzük, hogy ismétlődő eseményről van-e szó
  const isRecurringInstance = selectedEvent.id.includes('-recurring-');
  const isOriginalRecurring = selectedEvent.is_recurring;
  
  // Ha ismétlődő esemény és még nem kérdeztük meg a felhasználót
  if ((isRecurringInstance || isOriginalRecurring) && !showRecurringDialog) {
    setRecurringDialogAction('delete');
    setRecurringActionCallback(() => deleteAll => handleDeleteEventConfirmed(deleteAll));
    setShowRecurringDialog(true);
    return;
  }
  
  await handleDeleteEventConfirmed(deleteAll);
};

// Esemény törlése megerősítés után
const handleDeleteEventConfirmed = async (deleteAll = false) => {
  if (!selectedEvent) return;
  
  try {
    // Meghatározzuk, hogy melyik táblából kell törölni
    // Ha az ID tartalmazza a "recurring" szót, akkor ez egy kliens oldali generált ismétlődő esemény
    const isClientSideRecurring = selectedEvent.id.includes('-recurring-');
    
    // Ha ez egy kliens oldali generált ismétlődő esemény, akkor csak a helyi állapotot frissítjük
    if (isClientSideRecurring && !deleteAll) {
      // Csak a kiválasztott eseményt távolítjuk el a helyi állapotból
      setEvents(events.filter(event => event.id !== selectedEvent.id));
    } else {
      // Meghatározzuk az eredeti esemény azonosítóját
      const originalId = isClientSideRecurring 
        ? selectedEvent.id.split('-recurring-')[0] 
        : selectedEvent.id;
      
      // Ellenőrizzük, hogy az esemény az events vagy az appointments táblában van-e
      // Először próbáljuk meg az events táblából törölni
      const { error: eventsError } = await supabase
        .from('events')
        .delete()
        .eq('id', originalId);
      
      // Ha nem sikerült törölni az events táblából, próbáljuk meg az appointments táblából
      if (eventsError) {
        console.log('Az esemény nem található az events táblában, próbáljuk az appointments táblát:', eventsError);
        
        const { error: appointmentsError } = await supabase
          .from('appointments')
          .delete()
          .eq('id', originalId);
        
        if (appointmentsError) {
          console.error('Hiba történt az esemény törlése közben:', appointmentsError);
          toast({
            title: 'Hiba történt',
            description: 'Nem sikerült törölni az eseményt.',
            variant: 'destructive',
          });
          return;
        }
      }
      
      // Frissítjük a helyi állapotot
      if (deleteAll) {
        // Ha az összes ismétlődést törölni kell, akkor eltávolítjuk az eredeti eseményt és az összes ismétlődést
        const originalIdPrefix = isClientSideRecurring ? selectedEvent.id.split('-recurring-')[0] : selectedEvent.id;
        setEvents(events.filter(event => {
          // Ha az esemény azonosítója nem egyezik az eredetivel és nem tartalmazza az eredeti azonosítót a recurring részben
          return !(event.id === originalIdPrefix || (event.id.includes('-recurring-') && event.id.startsWith(originalIdPrefix)));
        }));
      } else {
        // Ha csak az adott alkalmat kell törölni, akkor csak azt távolítjuk el
        setEvents(events.filter(event => event.id !== selectedEvent.id));
      }
    }
    
    setShowEventDetailsDialog(false);
    setSelectedEvent(null);

    toast({
      title: 'Esemény törölve',
      description: `Az esemény sikeresen törölve lett a naptárból${deleteAll ? ' az összes ismétlődéssel együtt' : ''}.`,
    });
  } catch (error) {
    console.error('Hiba történt az esemény törlése közben:', error);
    toast({
      title: 'Hiba történt',
      description: 'Nem sikerült törölni az eseményt.',
      variant: 'destructive',
    });
  }
};

 // Esemény szerkesztése
const handleEditEvent = (editAll = false) => {
  if (!selectedEvent) return;
  
  // Ellenőrizzük, hogy ismétlődő eseményről van-e szó
  const isRecurringInstance = selectedEvent.id.includes('-recurring-');
  const isOriginalRecurring = selectedEvent.is_recurring;
  
  // Ha ismétlődő esemény és még nem kérdeztük meg a felhasználót
  if ((isRecurringInstance || isOriginalRecurring) && !showRecurringDialog) {
    setRecurringDialogAction('edit');
    setRecurringActionCallback(() => editAll => handleEditEventConfirmed(editAll));
    setShowRecurringDialog(true);
    return;
  }
  
  handleEditEventConfirmed(editAll);
};

// Esemény szerkesztése megerősítés után
const handleEditEventConfirmed = (editAll = false) => {
  if (!selectedEvent) return;
  
  // Ha az összes ismétlődést szerkeszteni kell, akkor az eredeti eseményt szerkesztjük
  if (editAll && selectedEvent.id.includes('-recurring-')) {
    // Megkeressük az eredeti eseményt
    const originalId = selectedEvent.id.split('-recurring-')[0];
    const originalEvent = events.find(event => event.id === originalId);
    
    if (originalEvent) {
      setSelectedEvent(originalEvent);
    }
  }
  
  setIsEditMode(true);
  setNewEvent({
    ...selectedEvent,
    is_recurring: selectedEvent.is_recurring || false
  });
  setShowEventDetailsDialog(false);
  setShowAddEventDialog(true);
};
    // Esemény frissítése
const handleUpdateEvent = async (editAll = false) => {
  if (!selectedEvent || !newEvent) return;
  
  try {
    // Meghatározzuk, hogy melyik táblából kell frissíteni
    const isRecurringInstance = selectedEvent.id.includes('-recurring-');
    const originalId = isRecurringInstance ? selectedEvent.id.split('-recurring-')[0] : selectedEvent.id;
    
    // Először próbáljuk meg az events táblából frissíteni
    const { error: eventsError } = await supabase
      .from('events')
      .update({
        title: newEvent.title,
        description: newEvent.description,
        start_time: newEvent.start_time,
        end_time: newEvent.end_time,
        location: newEvent.location,
        is_recurring: newEvent.is_recurring,
        event_type: newEvent.type
      })
      .eq('id', originalId);
    
    // Ha nem sikerült frissíteni az events táblából, próbáljuk meg az appointments táblából
    if (eventsError) {
      console.log('Az esemény nem található az events táblában, próbáljuk az appointments táblát:', eventsError);
      
      const { error: appointmentsError } = await supabase
        .from('appointments')
        .update({
          title: newEvent.title,
          description: newEvent.description,
          start_time: newEvent.start_time,
          end_time: newEvent.end_time,
          location: newEvent.location,
          is_recurring: newEvent.is_recurring
        })
        .eq('id', originalId);
      
      if (appointmentsError) {
        console.error('Hiba történt az esemény frissítése közben:', appointmentsError);
        toast({
          title: 'Hiba történt',
          description: 'Nem sikerült frissíteni az eseményt.',
          variant: 'destructive',
        });
        return;
      }
    }
    
    // Frissítjük a helyi állapotot
    if (editAll && (isRecurringInstance || selectedEvent.is_recurring)) {
      // Ha az összes ismétlődést frissíteni kell
      const updatedEvents = events.map(event => {
        // Ha az esemény az eredeti vagy annak egy ismétlődése
        if (event.id === originalId || (event.id.includes('-recurring-') && event.id.startsWith(originalId))) {
          // Megtartjuk az eredeti ID-t és az ismétlődési információkat
          const isRecurringInstance = event.id.includes('-recurring-');
          const recurringIndex = isRecurringInstance ? event.id.split('-recurring-')[1] : null;
          
          // Ha ez egy ismétlődő esemény, akkor kiszámoljuk az új időpontot
          if (isRecurringInstance && recurringIndex) {
            const weekOffset = parseInt(recurringIndex);
            const startTime = new Date(newEvent.start_time);
            const endTime = new Date(newEvent.end_time);
            
            startTime.setDate(startTime.getDate() + (weekOffset * 7));
            endTime.setDate(endTime.getDate() + (weekOffset * 7));
            
            return {
              ...newEvent,
              id: event.id,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              title: `${newEvent.title} (ismétlődő)`
            };
          }
          
          // Ha ez az eredeti esemény
          return {
            ...newEvent,
            id: event.id
          };
        }
        
        return event;
      });
      
      setEvents(updatedEvents);
    } else {
      // Ha csak az adott alkalmat kell frissíteni
      const updatedEvents = events.map(event => {
        if (event.id === selectedEvent.id) {
          return {
            ...newEvent,
            id: event.id
          };
        }
        return event;
      });
      
      setEvents(updatedEvents);
    }
    
    setShowAddEventDialog(false);
    setIsEditMode(false);
    resetNewEvent();
    
    toast({
      title: 'Esemény frissítve',
      description: `Az esemény sikeresen frissítve lett${editAll ? ' az összes ismétlődéssel együtt' : ''}.`,
    });
  } catch (error) {
    console.error('Hiba történt az esemény frissítése közben:', error);
    toast({
      title: 'Hiba történt',
      description: 'Nem sikerült frissíteni az eseményt.',
      variant: 'destructive',
    });
  }
};

 // Új esemény alaphelyzetbe állítása
const resetNewEvent = () => {
  setNewEvent({
    title: '',
    description: '',
    start_time: format(new Date().setHours(9, 0, 0, 0), "yyyy-MM-dd'T'HH:mm"),
    end_time: format(new Date().setHours(10, 0, 0, 0), "yyyy-MM-dd'T'HH:mm"),
    location: '',
    type: 'personal'
  });
  setIsRecurring(false);
};

  // Esemény típus színének meghatározása
  const getEventTypeColor = (type: EventType) => {
    switch (type) {
      case 'personal':
        return 'bg-blue-500';
      case 'training':
        return 'bg-green-500';
      case 'group':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Esemény típus nevének meghatározása
  const getEventTypeName = (type: EventType) => {
    switch (type) {
      case 'personal':
        return 'Személyes';
      case 'training':
        return 'Edzés';
      case 'group':
        return 'Csoportos';
      default:
        return 'Egyéb';
    }
  };

  // Hónap első és utolsó napjának meghatározása
  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  
  // Hónap napjainak listája
  const daysInMonth = eachDayOfInterval({
    start: firstDayOfMonth,
    end: lastDayOfMonth
  });

  // Előző hónap
  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  // Következő hónap
  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  // Előző hét
  const handlePreviousWeek = () => {
    setCurrentDate(subDays(currentDate, 7));
  };

  // Következő hét
  const handleNextWeek = () => {
    setCurrentDate(addDays(currentDate, 7));
  };

  // Előző nap
  const handlePreviousDay = () => {
    setCurrentDate(subDays(currentDate, 1));
  };

  // Következő nap
  const handleNextDay = () => {
    setCurrentDate(addDays(currentDate, 1));
  };

  // Nap eseményeinek lekérése
  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = parseISO(event.start_time);
      return isSameDay(eventDate, day);
    });
  };

  // Esemény kiválasztása
  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setShowEventDetailsDialog(true);
  };

  // Nap kiválasztása új esemény hozzáadásához
  const handleSelectDay = (day: Date) => {
    setSelectedDate(day);
    
    // Új esemény kezdő és befejező időpontjának beállítása a kiválasztott napra
    const startTime = new Date(day);
    startTime.setHours(9, 0, 0, 0);
    
    const endTime = new Date(day);
    endTime.setHours(10, 0, 0, 0);
    
    setNewEvent({
      ...newEvent,
      start_time: format(startTime, "yyyy-MM-dd'T'HH:mm"),
      end_time: format(endTime, "yyyy-MM-dd'T'HH:mm")
    });
    
    setShowAddEventDialog(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 pt-24">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Naptár</h1>
          
          {profile?.is_trainer && (
            <Button onClick={toggleAvailabilityView} variant="outline" className="ml-auto mr-4">
              {showAvailability ? 'Vissza a naptárhoz' : 'Elérhetőségeim kezelése'}
            </Button>
          )}
          
          {!showAvailability && (
            <Button onClick={() => {
              setIsEditMode(false);
              resetNewEvent();
              if (selectedDate) {
                handleSelectDay(selectedDate);
              } else {
                handleSelectDay(new Date());
              }
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Új esemény
            </Button>
          )}
        </div>

        {showAvailability && profile?.is_trainer ? (
          <TrainerAvailabilityCalendar />
        ) : (
          <div className="space-y-6">
            <Tabs defaultValue="month" className="w-full" onValueChange={(value) => setActiveView(value as 'month' | 'week' | 'day')}>
              <div className="flex justify-between items-center mb-4">
                <TabsList>
                  <TabsTrigger value="month">Hónap</TabsTrigger>
                  <TabsTrigger value="week">Hét</TabsTrigger>
                  <TabsTrigger value="day">Nap</TabsTrigger>
                </TabsList>
                
                <div className="flex items-center space-x-2">
                  {/* Navigációs gombok az aktív nézet alapján */}
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={
                      activeView === 'month' ? handlePreviousMonth : 
                      activeView === 'week' ? handlePreviousWeek : 
                      handlePreviousDay
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  {/* Dátum megjelenítése az aktív nézet alapján */}
                  <h2 className="text-lg font-medium text-gray-900 min-w-[200px] text-center">
                    {activeView === 'month' && format(currentDate, 'MMMM yyyy', { locale: hu })}
                    {activeView === 'week' && `${format(startOfWeek(currentDate, { locale: hu, weekStartsOn: 1 }), 'MMM d', { locale: hu })} - ${format(endOfWeek(currentDate, { locale: hu, weekStartsOn: 1 }), 'MMM d, yyyy', { locale: hu })}`}
                    {activeView === 'day' && format(currentDate, 'yyyy. MMMM d., EEEE', { locale: hu })}
                  </h2>
                  
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={
                      activeView === 'month' ? handleNextMonth : 
                      activeView === 'week' ? handleNextWeek : 
                      handleNextDay
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <TabsContent value="month" className="mt-2">
                <MonthView 
                  currentDate={currentDate}
                  events={events}
                  onSelectDay={handleSelectDay}
                  onSelectEvent={handleSelectEvent}
                  getEventTypeColor={getEventTypeColor}
                  selectedDate={selectedDate}
                />
              </TabsContent>

              <TabsContent value="week" className="mt-2">
                <Card>
                  <CardContent className="p-6">
                    <WeekView 
                      currentDate={currentDate}
                      events={events}
                      onSelectDay={handleSelectDay}
                      onSelectEvent={handleSelectEvent}
                      setActiveView={setActiveView}
                      getEventTypeColor={getEventTypeColor}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="day" className="mt-2">
                <Card>
                  <CardContent className="p-6">
                    <DayView 
                      currentDate={currentDate}
                      events={events}
                      onSelectDay={handleSelectDay}
                      onSelectEvent={handleSelectEvent}
                      getEventTypeColor={getEventTypeColor}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Új esemény hozzáadása dialógus */}
        <Dialog open={showAddEventDialog} onOpenChange={setShowAddEventDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Esemény szerkesztése' : 'Új esemény hozzáadása'}</DialogTitle>
              <DialogDescription>
                Add meg az esemény részleteit az alábbi űrlapon.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Cím</Label>
                <Input
                  id="title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Esemény címe"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Leírás</Label>
                <Textarea
                  id="description"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Esemény leírása"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
                <Label htmlFor="recurring">Heti ismétlődés</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start_time">Kezdés</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={newEvent.start_time}
                    onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="end_time">Befejezés</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={newEvent.end_time}
                    onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="location">Helyszín</Label>
                <Input
                  id="location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  placeholder="Esemény helyszíne"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="type">Típus</Label>
                <Select
                  value={newEvent.type}
                  onValueChange={(value) => setNewEvent({ ...newEvent, type: value as EventType })}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Válassz típust" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Személyes</SelectItem>
                    <SelectItem value="training">Edzés</SelectItem>
                    <SelectItem value="group">Csoportos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowAddEventDialog(false);
                if (isEditMode) {
                  setIsEditMode(false);
                  setSelectedEvent(null);
                }
                resetNewEvent();
              }}>
                Mégse
              </Button>
              <Button onClick={() => isEditMode ? handleUpdateEvent(false) : handleAddEvent()}>
                {isEditMode ? 'Mentés' : 'Hozzáadás'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Esemény részletek dialógus */}
        <Dialog open={showEventDetailsDialog} onOpenChange={setShowEventDetailsDialog}>
          <DialogContent className="sm:max-w-[500px]">
            {selectedEvent && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-xl">{selectedEvent.title}</DialogTitle>
                    <Badge className={`${getEventTypeColor(selectedEvent.type)} text-white`}>
                      {getEventTypeName(selectedEvent.type)}
                    </Badge>
                  </div>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="flex items-start space-x-2">
                    <Clock className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Időpont</p>
                      <p className="text-sm text-gray-600">
                        {format(parseISO(selectedEvent.start_time), 'yyyy. MMMM d., HH:mm', { locale: hu })} - 
                        {format(parseISO(selectedEvent.end_time), ' HH:mm', { locale: hu })}
                      </p>
                    </div>
                  </div>
                  
                  {selectedEvent.location && (
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Helyszín</p>
                        <p className="text-sm text-gray-600">{selectedEvent.location}</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedEvent.description && (
                    <div className="pt-2">
                      <p className="text-sm font-medium text-gray-700 mb-1">Leírás</p>
                      <p className="text-sm text-gray-600">{selectedEvent.description}</p>
                    </div>
                  )}
                </div>
                
                <DialogFooter className="flex justify-between">
                  <Button variant="destructive" onClick={() => handleDeleteEvent(false)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Törlés
                  </Button>
                  <Button onClick={() => handleEditEvent(false)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Szerkesztés
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        <RecurringEventDialog
          open={showRecurringDialog}
          onOpenChange={setShowRecurringDialog}
          onConfirm={(deleteAll) => {
            if (typeof recurringActionCallback === 'function') {
              recurringActionCallback(deleteAll);
            }
            setShowRecurringDialog(false);
          }}
          onCancel={() => {
            setShowRecurringDialog(false);
            setShowEventDetailsDialog(false);
            setSelectedEvent(null);
          }}
          title={`Ismétlődő esemény ${recurringDialogAction === 'delete' ? 'törlése' : 'szerkesztése'}`}
          description={`Ez egy ismétlődő esemény. Szeretnéd ${recurringDialogAction === 'delete' ? 'törölni' : 'szerkeszteni'} az összes ismétlődést, vagy csak ezt az alkalmat?`}
          actionType={recurringDialogAction}
        />

      </main>
    </div>
  );
};

export default CalendarPage;
