import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, addHours } from 'date-fns';
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
import Navigation from '@/components/Navigation';
import { useSearchParams } from 'react-router-dom';
import TrainerAvailabilityCalendar from '@/components/TrainerAvailabilityCalendar';

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
        // Itt majd a Supabase-ből fogjuk lekérni az eseményeket
        // Egyelőre példa adatokat használunk
        const exampleEvents: Event[] = [
          {
            id: '1',
            title: 'Reggeli edzés',
            description: 'Kardió és erősítés',
            start_time: format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
            end_time: format(addHours(new Date(), 2), "yyyy-MM-dd'T'HH:mm"),
            location: 'Edzőterem',
            type: 'training'
          },
          {
            id: '2',
            title: 'Csoportos óra',
            description: 'Spinning',
            start_time: format(addHours(new Date(), 4), "yyyy-MM-dd'T'HH:mm"),
            end_time: format(addHours(new Date(), 5), "yyyy-MM-dd'T'HH:mm"),
            location: 'Spinning terem',
            type: 'group'
          },
          {
            id: '3',
            title: 'Személyes találkozó',
            description: 'Táplálkozási tanácsadás',
            start_time: format(addHours(new Date(), 8), "yyyy-MM-dd'T'HH:mm"),
            end_time: format(addHours(new Date(), 9), "yyyy-MM-dd'T'HH:mm"),
            location: 'Iroda',
            type: 'personal'
          }
        ];

        setEvents(exampleEvents);
      } catch (error) {
        console.error('Hiba történt az események betöltése közben:', error);
        toast({
          title: 'Hiba történt',
          description: 'Nem sikerült betölteni az eseményeket.',
          variant: 'destructive',
        });
      }
    };

    fetchEvents();
  }, [user, toast]);

  // Új esemény hozzáadása
  const handleAddEvent = async () => {
    if (!user) return;

    try {
      // Itt majd a Supabase-be fogjuk menteni az eseményt
      // Egyelőre csak a helyi állapotot frissítjük
      const newEventWithId: Event = {
        ...newEvent,
        id: Math.random().toString(36).substring(2, 9)
      };

      setEvents([...events, newEventWithId]);
      setShowAddEventDialog(false);
      resetNewEvent();

      toast({
        title: 'Esemény hozzáadva',
        description: 'Az esemény sikeresen hozzá lett adva a naptárhoz.',
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
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    try {
      // Itt majd a Supabase-ből fogjuk törölni az eseményt
      // Egyelőre csak a helyi állapotot frissítjük
      setEvents(events.filter(event => event.id !== selectedEvent.id));
      setShowEventDetailsDialog(false);
      setSelectedEvent(null);

      toast({
        title: 'Esemény törölve',
        description: 'Az esemény sikeresen törölve lett a naptárból.',
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
  const handleEditEvent = () => {
    if (!selectedEvent) return;

    setNewEvent({
      title: selectedEvent.title,
      description: selectedEvent.description || '',
      start_time: selectedEvent.start_time,
      end_time: selectedEvent.end_time,
      location: selectedEvent.location || '',
      type: selectedEvent.type
    });

    setIsEditMode(true);
    setShowEventDetailsDialog(false);
    setShowAddEventDialog(true);
  };

  // Esemény frissítése
  const handleUpdateEvent = async () => {
    if (!selectedEvent) return;

    try {
      // Itt majd a Supabase-ben fogjuk frissíteni az eseményt
      // Egyelőre csak a helyi állapotot frissítjük
      const updatedEvents = events.map(event => {
        if (event.id === selectedEvent.id) {
          return {
            ...event,
            ...newEvent
          };
        }
        return event;
      });

      setEvents(updatedEvents);
      setShowAddEventDialog(false);
      setIsEditMode(false);
      setSelectedEvent(null);
      resetNewEvent();

      toast({
        title: 'Esemény frissítve',
        description: 'Az esemény sikeresen frissítve lett.',
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
      <Navigation />
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
                  <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-lg font-medium text-gray-900 min-w-[150px] text-center">
                    {format(currentDate, 'MMMM yyyy', { locale: hu })}
                  </h2>
                  <Button variant="outline" size="icon" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <TabsContent value="month" className="mt-2">
                <div className="grid grid-cols-7 gap-2">
                  {/* Hét napjai */}
                  {['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'].map((day, index) => (
                    <div key={index} className="text-center font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                  
                  {/* Naptár napjai */}
                  {daysInMonth.map((day, index) => {
                    const dayEvents = getEventsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    
                    return (
                      <div
                        key={index}
                        className={`
                          min-h-[100px] border rounded-lg p-2 transition-colors
                          ${isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}
                          ${isToday ? 'border-primary' : 'border-gray-200'}
                          ${isSelected ? 'ring-2 ring-primary ring-opacity-50' : ''}
                          hover:border-primary cursor-pointer
                        `}
                        onClick={() => handleSelectDay(day)}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
                            {format(day, 'd')}
                          </span>
                          {dayEvents.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {dayEvents.length}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1 mt-1">
                          {dayEvents.slice(0, 3).map((event, eventIndex) => (
                            <div
                              key={eventIndex}
                              className={`text-xs px-1.5 py-0.5 rounded truncate text-white ${getEventTypeColor(event.type)}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectEvent(event);
                              }}
                            >
                              {format(parseISO(event.start_time), 'HH:mm')} {event.title}
                            </div>
                          ))}
                          
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-gray-500 pl-1">
                              +{dayEvents.length - 3} további
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="week" className="mt-2">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-center text-gray-500">Heti nézet hamarosan...</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="day" className="mt-2">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-center text-gray-500">Napi nézet hamarosan...</p>
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
              <Button onClick={isEditMode ? handleUpdateEvent : handleAddEvent}>
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
                  <Button variant="destructive" onClick={handleDeleteEvent}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Törlés
                  </Button>
                  <Button onClick={handleEditEvent}>
                    <Edit className="mr-2 h-4 w-4" />
                    Szerkesztés
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default CalendarPage;
