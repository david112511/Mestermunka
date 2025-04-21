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
import { Switch } from '@/components/ui/switch';

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
  is_recurring?: boolean;
  specific_date?: string; // YYYY-MM-DD formátumban a nem ismétlődő időpontokhoz
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
  const [isRecurring, setIsRecurring] = useState(true);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState<{slot: TimeSlot, date: Date} | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    fetchTrainerAvailability, 
    setTrainerAvailabilityTimes,
    addAvailabilityException,
    fetchTrainerAvailabilityExceptions
  } = useAppointments();

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
        
        // Kivételek lekérése
        const exceptionData = await fetchTrainerAvailabilityExceptions(user.id);
        setExceptions(exceptionData || []);
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
  }, [user, fetchTrainerAvailability, fetchTrainerAvailabilityExceptions, toast]);

 // Új időslot hozzáadása
const handleAddTimeSlot = async () => {
  // Ellenőrizzük, hogy a kezdési idő korábbi-e, mint a befejezési idő
  if (newTimeSlot.start_time >= newTimeSlot.end_time) {
    toast({
      title: 'Érvénytelen időtartam',
      description: 'A kezdési időpontnak korábbinak kell lennie, mint a befejezési időpontnak.',
      variant: 'destructive',
    });
    return;
  }

  try {
    if (isRecurring) {
      // Ha ismétlődő, akkor a hét napjához kötjük
      const newSlot: TimeSlot = {
        id: `temp-${Date.now()}`,
        ...newTimeSlot,
        is_recurring: true
      };
      
      setTimeSlots([...timeSlots, newSlot]);
    } else {
      // Ha nem ismétlődő, akkor csak az adott napra adjuk hozzá
      const selectedDay = selectedDate.getDay();
      
      // Egyedi azonosító a nem ismétlődő időpontnak, ami tartalmazza a dátumot is
      const uniqueId = `temp-${selectedDate.toISOString().split('T')[0]}-${Date.now()}`;

      const formattedDate = selectedDate.toISOString().split('T')[0];
      
      const newSlot: TimeSlot = {
        id: uniqueId,
        day_of_week: selectedDay,
        start_time: newTimeSlot.start_time,
        end_time: newTimeSlot.end_time,
        is_recurring: false,
        specific_date: formattedDate
      };
      
      // Hozzáadjuk a timeslots-hoz
      setTimeSlots([...timeSlots, newSlot]);
      
      // Jelezzük a felhasználónak, hogy ez egy egyszeri időpont
      toast({
        title: 'Egyszeri időpont hozzáadva',
        description: `Az időpont csak ${format(selectedDate, 'yyyy. MMMM d.', { locale: hu })} napra lett beállítva.`,
      });
      
      // Azonnal hozzáadjuk kivételként minden más napra, hogy csak ezen a napon jelenjen meg
      if (user) {
        // Formázzuk az adott napot ISO formátumra (YYYY-MM-DD)
        const formattedDate = selectedDate.toISOString().split('T')[0];
        
        // Hozzáadjuk a kivételt a helyi állapothoz, hogy azonnal látható legyen a változás
        const weekDays = eachDayOfInterval({
          start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
          end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
        });
        
        const newExceptions = weekDays
          .filter(day => !isSameDay(day, selectedDate))
          .map(day => ({
            exception_date: day.toISOString().split('T')[0],
            original_slot_id: uniqueId
          }));
        
        if (newExceptions.length > 0) {
          setExceptions([...exceptions, ...newExceptions]);
        }
        
        // Aszinkron módon hozzáadjuk a kivételeket az adatbázishoz
        const exceptionPromises = weekDays
          .filter(day => !isSameDay(day, selectedDate))
          .map(day => 
            addAvailabilityException(
              user.id,
              day,
              uniqueId,
              newTimeSlot.start_time,
              newTimeSlot.end_time,
              selectedDay
            )
          );
        
        // Megvárjuk az összes kivétel hozzáadását
        await Promise.all(exceptionPromises).catch(error => {
          console.error('Hiba a kivételek hozzáadásakor:', error);
          // Nem jelzünk hibát a felhasználónak, mert a helyi állapotot már frissítettük
        });
      }
    }
    
    setShowAddDialog(false);
    
    // Visszaállítjuk az alapértelmezett értékeket
    setNewTimeSlot({
      day_of_week: new Date().getDay(),
      start_time: '09:00',
      end_time: '17:00',
    });
    setIsRecurring(true);
  } catch (error) {
    console.error('Hiba az időpont hozzáadásakor:', error);
    toast({
      title: 'Hiba történt',
      description: 'Nem sikerült hozzáadni az időpontot.',
      variant: 'destructive',
    });
  }
};

  // Időslot törlése - módosítva, hogy megjelenítsen egy dialógust a törlés típusának kiválasztásához
  const handleRemoveTimeSlot = (slotId: string, date: Date) => {
    const slot = timeSlots.find(s => s.id === slotId);
    if (!slot) return;
    
    setSlotToDelete({ slot, date });
    setShowDeleteDialog(true);
  };

  // Csak az adott nap időpontjának törlése (kivételként kezelve)
  const handleRemoveSingleOccurrence = async () => {
    if (!user || !slotToDelete) return;
    
    try {
      const success = await addAvailabilityException(
        user.id,
        slotToDelete.date,
        slotToDelete.slot.id,
        slotToDelete.slot.start_time,
        slotToDelete.slot.end_time,
        slotToDelete.slot.day_of_week
      );
      
      if (success) {
        // Frissítsük a kivételek listáját
        const updatedExceptions = await fetchTrainerAvailabilityExceptions(user.id);
        setExceptions(updatedExceptions || []);
        
        // Frissítsük a felhasználói felületet azonnal, hogy a törölt időpont eltűnjön
        const formattedDate = slotToDelete.date.toISOString().split('T')[0];
        const newException = {
          exception_date: formattedDate,
          original_slot_id: slotToDelete.slot.id
        };
        setExceptions([...exceptions, newException]);
      }
    } catch (error) {
      console.error('Hiba az időpont törlésekor:', error);
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült törölni az időpontot.',
        variant: 'destructive',
      });
    } finally {
      setShowDeleteDialog(false);
      setSlotToDelete(null);
    }
  };

  // Az összes ismétlődő időpont törlése
  const handleRemoveAllOccurrences = () => {
    if (!slotToDelete) return;
    
    setTimeSlots(timeSlots.filter(slot => slot.id !== slotToDelete.slot.id));
    setShowDeleteDialog(false);
    setSlotToDelete(null);
    
    toast({
      title: 'Időpontok törölve',
      description: 'Az összes ismétlődő időpont sikeresen törölve lett.',
    });
  };

  // Ellenőrizzük, hogy egy adott időpont kivételként szerepel-e
  const isSlotException = (slotId: string, date: Date) => {
    if (!exceptions || exceptions.length === 0) return false;
    
    const formattedDate = date.toISOString().split('T')[0];
    return exceptions.some(
      exception => 
        exception.exception_date === formattedDate && 
        (exception.original_slot_id === slotId || exception.original_slot_id === slotId.toString())
    );
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
        is_recurring: slot.is_recurring !== undefined ? slot.is_recurring : true,
        specific_date: slot.specific_date || null,
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
const getTimeSlotsForDay = (dayOfWeek: number, date: Date) => {
  const formattedDate = date.toISOString().split('T')[0];
  
  return timeSlots.filter(slot => {
    // Ismétlődő időpontok esetén a hét napja számít
    if (slot.is_recurring === true) {
      return slot.day_of_week === dayOfWeek;
    }
    // Nem ismétlődő időpontok esetén a konkrét dátum számít
    else if (slot.is_recurring === false && slot.specific_date) {
      return slot.specific_date === formattedDate;
    }
    // Régi formátumú időpontok (nincs is_recurring mező) esetén a hét napja számít
    else {
      return slot.day_of_week === dayOfWeek;
    }
  });
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
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="recurring"
                        checked={isRecurring}
                        onCheckedChange={setIsRecurring}
                      />
                      <Label htmlFor="recurring">Heti ismétlődés</Label>
                    </div>
                    
                    {isRecurring ? (
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
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="date">Dátum</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                              id="date"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(selectedDate, 'yyyy. MMMM d.', { locale: hu })}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => date && setSelectedDate(date)}
                              initialFocus
                              locale={hu}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
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
                const daySlots = getTimeSlotsForDay(dayOfWeek, day);
    
                return (
                  <div key={dayOfWeek} className="border rounded-md p-2 min-h-[200px]">
                    <div className="text-center border-b pb-2 mb-2">
                      <div className="font-medium">{dayName}</div>
                      <div className="text-sm text-gray-500">{dayNumber}</div>
                    </div>
                    <ScrollArea className="h-[150px]">
                      <div className="space-y-2">
                        {daySlots.length > 0 ? (
                          daySlots.map((slot) => {
                            const isException = isSlotException(slot.id, day);
                            
                            // Ha kivétel, ne jelenítse meg
                            if (isException) return null;
                            
                            return (
                              <div 
                                key={slot.id} 
                                className="flex items-center justify-between bg-gray-100 rounded-md p-2 text-sm"
                              >
                                <div className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1 text-gray-500" />
                                  <span>
                                    {slot.start_time} - {slot.end_time}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveTimeSlot(slot.id, day)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center text-sm text-gray-500 py-4">
                            Nincs beállított időpont
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                );
              })}
            </div>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Tipp</AlertTitle>
            <AlertDescription>
              Az elérhetőségi idők beállítása után ne felejtsd el menteni a változtatásokat.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Törlés megerősítése dialógus */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Időpont törlése</DialogTitle>
            <DialogDescription>
              Hogyan szeretnéd törölni ezt az időpontot?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col space-y-2">
              <Button onClick={handleRemoveSingleOccurrence} variant="outline">
                Csak ezt az egy alkalmat
              </Button>
              <Button onClick={handleRemoveAllOccurrences} variant="outline">
                Összes ismétlődést
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>Mégsem</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Segéd komponens a nyilakhoz
function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
