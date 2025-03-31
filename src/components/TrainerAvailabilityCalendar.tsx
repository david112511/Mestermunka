import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, parseISO, isSameDay } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Clock, Plus, Save, Trash2, Info, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAppointments, TrainerAvailability } from '@/hooks/useAppointments';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// A hét napjai
const daysOfWeek = [
  { value: 1, label: 'Hétfő' },
  { value: 2, label: 'Kedd' },
  { value: 3, label: 'Szerda' },
  { value: 4, label: 'Csütörtök' },
  { value: 5, label: 'Péntek' },
  { value: 6, label: 'Szombat' },
  { value: 0, label: 'Vasárnap' },
];

interface TimeSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export default function TrainerAvailabilityCalendar() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTimeSlot, setNewTimeSlot] = useState<Omit<TimeSlot, 'id'>>({
    day_of_week: new Date().getDay(),
    start_time: '09:00',
    end_time: '17:00',
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const { fetchTrainerAvailability, setTrainerAvailabilityTimes } = useAppointments();

  // Edző elérhetőségeinek lekérése
  useEffect(() => {
    if (!user) return;

    const loadAvailability = async () => {
      setIsLoading(true);
      try {
        const availability = await fetchTrainerAvailability(user.id);
        
        if (availability && availability.length > 0) {
          const formattedSlots = availability.map(slot => ({
            id: slot.id,
            day_of_week: slot.day_of_week,
            start_time: slot.start_time.substring(0, 5), // HH:MM formátum
            end_time: slot.end_time.substring(0, 5), // HH:MM formátum
          }));
          
          setTimeSlots(formattedSlots);
        }
      } catch (error) {
        console.error('Hiba az elérhetőségek betöltésekor:', error);
        toast({
          title: 'Hiba történt',
          description: 'Nem sikerült betölteni az elérhetőségi időket.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailability();
  }, [user, fetchTrainerAvailability, toast]);

  // Új időslot hozzáadása
  const handleAddTimeSlot = () => {
    // Ellenőrizzük, hogy a kezdési idő korábbi-e, mint a befejezési idő
    if (newTimeSlot.start_time >= newTimeSlot.end_time) {
      toast({
        title: 'Érvénytelen időtartam',
        description: 'A kezdési időpontnak korábbinak kell lennie, mint a befejezési időpontnak.',
        variant: 'destructive',
      });
      return;
    }

    const newSlot: TimeSlot = {
      id: `temp-${Date.now()}`,
      ...newTimeSlot
    };
    
    setTimeSlots([...timeSlots, newSlot]);
    setShowAddDialog(false);
    
    // Visszaállítjuk az alapértelmezett értékeket
    setNewTimeSlot({
      day_of_week: new Date().getDay(),
      start_time: '09:00',
      end_time: '17:00',
    });
  };

  // Időslot törlése
  const handleRemoveTimeSlot = (id: string) => {
    setTimeSlots(timeSlots.filter(slot => slot.id !== id));
  };

  // Elérhetőségi idők mentése
  const handleSaveAvailability = async () => {
    if (!user) return;
    
    // Validáció
    for (const slot of timeSlots) {
      if (!slot.start_time || !slot.end_time) {
        toast({
          title: 'Hiányzó adatok',
          description: 'Kérjük, add meg az összes időpontot.',
          variant: 'destructive',
        });
        return;
      }
      
      if (slot.start_time >= slot.end_time) {
        toast({
          title: 'Érvénytelen időtartam',
          description: 'A kezdési időpontnak korábbinak kell lennie, mint a befejezési időpontnak.',
          variant: 'destructive',
        });
        return;
      }
    }
    
    setIsSaving(true);
    try {
      // Formázás az adatbázis formátumára
      const availabilityData = timeSlots.map(slot => ({
        trainer_id: user.id,
        day_of_week: slot.day_of_week,
        start_time: `${slot.start_time}:00`, // HH:MM:SS formátum
        end_time: `${slot.end_time}:00`, // HH:MM:SS formátum
        is_available: true,
      }));
      
      const success = await setTrainerAvailabilityTimes(availabilityData);
      
      if (success) {
        toast({
          title: 'Sikeres mentés',
          description: 'Az elérhetőségi idők sikeresen mentve.',
        });
      }
    } catch (error) {
      console.error('Hiba az elérhetőségi idők mentésekor:', error);
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült menteni az elérhetőségi időket.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // A hét napjainak generálása a naptárhoz
  const weekDays = eachDayOfInterval({
    start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
    end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
  });

  // Adott naphoz tartozó időslotok lekérése
  const getTimeSlotsForDay = (dayOfWeek: number) => {
    return timeSlots.filter(slot => slot.day_of_week === dayOfWeek);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarIcon className="mr-2 h-5 w-5" />
            Elérhetőségi naptár
          </CardTitle>
          <CardDescription>
            Állítsd be, hogy a hét mely napjain és időpontjaiban vagy elérhető edzésekre
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() - 7);
                  setSelectedDate(newDate);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium">
                {format(weekDays[0], 'yyyy. MMM d.', { locale: hu })} - {format(weekDays[6], 'yyyy. MMM d.', { locale: hu })}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() + 7);
                  setSelectedDate(newDate);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex space-x-2">
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Új időpont
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Új elérhetőségi idő hozzáadása</DialogTitle>
                    <DialogDescription>
                      Add meg, hogy a hét mely napján és milyen időpontban vagy elérhető.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="day">Nap</Label>
                      <Select
                        value={newTimeSlot.day_of_week.toString()}
                        onValueChange={(value) => setNewTimeSlot({
                          ...newTimeSlot,
                          day_of_week: parseInt(value)
                        })}
                      >
                        <SelectTrigger id="day">
                          <SelectValue placeholder="Válassz napot" />
                        </SelectTrigger>
                        <SelectContent>
                          {daysOfWeek.map((day) => (
                            <SelectItem key={day.value} value={day.value.toString()}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start-time">Kezdés</Label>
                        <Input
                          id="start-time"
                          type="time"
                          value={newTimeSlot.start_time}
                          onChange={(e) => setNewTimeSlot({
                            ...newTimeSlot,
                            start_time: e.target.value
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-time">Befejezés</Label>
                        <Input
                          id="end-time"
                          type="time"
                          value={newTimeSlot.end_time}
                          onChange={(e) => setNewTimeSlot({
                            ...newTimeSlot,
                            end_time: e.target.value
                          })}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>Mégsem</Button>
                    <Button onClick={handleAddTimeSlot}>Hozzáadás</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button onClick={handleSaveAvailability} disabled={isSaving}>
                {isSaving ? 'Mentés...' : 'Mentés'}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p>Elérhetőségi idők betöltése...</p>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const dayOfWeek = day.getDay();
                const dayName = format(day, 'EEEE', { locale: hu });
                const dayNumber = format(day, 'd');
                const daySlots = getTimeSlotsForDay(dayOfWeek);
                
                return (
                  <div key={dayOfWeek} className="border rounded-md p-2 min-h-[200px]">
                    <div className="text-center border-b pb-2 mb-2">
                      <div className="font-medium">{dayName}</div>
                      <div className="text-2xl">{dayNumber}</div>
                    </div>
                    <ScrollArea className="h-[150px]">
                      <div className="space-y-2">
                        {daySlots.length === 0 ? (
                          <div className="text-center text-sm text-muted-foreground py-2">
                            Nincs beállított elérhetőség
                          </div>
                        ) : (
                          daySlots.map((slot) => (
                            <div 
                              key={slot.id} 
                              className="bg-primary/10 text-primary rounded-md p-2 text-sm flex justify-between items-center"
                            >
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>{slot.start_time} - {slot.end_time}</span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={() => handleRemoveTimeSlot(slot.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Segéd komponens a nyilakhoz
const ChevronLeft = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRight = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
