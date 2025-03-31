import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Clock, Plus, Save, Trash2, Info, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAppointments, TrainerAvailability } from '@/hooks/useAppointments';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const daysOfWeek = [
  { value: '1', label: 'Hétfő' },
  { value: '2', label: 'Kedd' },
  { value: '3', label: 'Szerda' },
  { value: '4', label: 'Csütörtök' },
  { value: '5', label: 'Péntek' },
  { value: '6', label: 'Szombat' },
  { value: '0', label: 'Vasárnap' },
];

interface TimeSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export default function TrainerAvailabilitySettingsV2() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const { fetchTrainerAvailability, setTrainerAvailabilityTimes } = useAppointments();

  // Edző elérhetőségeinek lekérése
  useEffect(() => {
    if (!user) return;

    const loadAvailability = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        console.log('Fetching availability for trainer:', user.id);
        const availability = await fetchTrainerAvailability(user.id);
        
        console.log('Received availability data:', availability);
        
        if (availability && availability.length > 0) {
          const formattedSlots = availability.map(slot => ({
            id: slot.id,
            day_of_week: slot.day_of_week,
            start_time: slot.start_time.substring(0, 5), // HH:MM formátum
            end_time: slot.end_time.substring(0, 5), // HH:MM formátum
          }));
          
          console.log('Formatted time slots:', formattedSlots);
          setTimeSlots(formattedSlots);
        } else {
          console.log('No availability data found, setting empty time slots');
          setTimeSlots([]);
        }
      } catch (error) {
        console.error('Hiba az elérhetőségek betöltésekor:', error);
        setLoadError('Nem sikerült betölteni az elérhetőségi időket. Kérjük, próbáld újra később.');
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
    const newSlot: TimeSlot = {
      id: `temp-${Date.now()}`,
      day_of_week: 1, // Hétfő
      start_time: '09:00',
      end_time: '17:00',
    };
    
    setTimeSlots([...timeSlots, newSlot]);
  };

  // Időslot törlése
  const handleRemoveTimeSlot = (id: string) => {
    setTimeSlots(timeSlots.filter(slot => slot.id !== id));
  };

  // Időslot módosítása
  const handleUpdateTimeSlot = (id: string, field: keyof TimeSlot, value: string) => {
    setTimeSlots(timeSlots.map(slot => {
      if (slot.id === id) {
        if (field === 'day_of_week') {
          return { ...slot, [field]: parseInt(value) };
        }
        return { ...slot, [field]: value };
      }
      return slot;
    }));
  };

  // Refresh availability data
  const handleRefresh = async () => {
    if (!user) return;
    
    setIsRefreshing(true);
    setLoadError(null);
    try {
      console.log('Refreshing availability data for trainer:', user.id);
      const availability = await fetchTrainerAvailability(user.id);
      
      if (availability && availability.length > 0) {
        const formattedSlots = availability.map(slot => ({
          id: slot.id,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time.substring(0, 5), // HH:MM formátum
          end_time: slot.end_time.substring(0, 5), // HH:MM formátum
        }));
        
        setTimeSlots(formattedSlots);
        toast({
          title: 'Sikeres frissítés',
          description: 'Az elérhetőségi idők sikeresen frissítve.',
        });
      } else {
        setTimeSlots([]);
        toast({
          title: 'Nincs adat',
          description: 'Nincsenek beállított elérhetőségi idők.',
        });
      }
    } catch (error) {
      console.error('Hiba az elérhetőségi idők frissítésekor:', error);
      setLoadError('Nem sikerült frissíteni az elérhetőségi időket.');
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült frissíteni az elérhetőségi időket.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
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
      console.log('Saving availability data for trainer:', user.id);
      console.log('Current time slots to save:', timeSlots);
      
      // Formázás az adatbázis formátumára
      const availabilityData = timeSlots.map(slot => ({
        trainer_id: user.id,
        day_of_week: slot.day_of_week,
        start_time: `${slot.start_time}:00`, // HH:MM:SS formátum
        end_time: `${slot.end_time}:00`, // HH:MM:SS formátum
        is_available: true,
      }));
      
      console.log('Formatted availability data for saving:', availabilityData);
      
      const success = await setTrainerAvailabilityTimes(availabilityData);
      
      if (success) {
        console.log('Successfully saved availability data');
        toast({
          title: 'Sikeres mentés',
          description: 'Az elérhetőségi idők sikeresen mentve.',
        });
        
        // Frissítsük az adatokat a sikeres mentés után
        handleRefresh();
      } else {
        console.error('Failed to save availability data');
        toast({
          title: 'Hiba történt',
          description: 'Nem sikerült menteni az elérhetőségi időket. Kérjük, próbáld újra később.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Hiba az elérhetőségi idők mentésekor:', error);
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült menteni az elérhetőségi időket. Részletek a konzolban.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Elérhetőségi idők beállítása</CardTitle>
          <CardDescription>
            Add meg, hogy mikor vagy elérhető edzésekre. A kliensek csak ezekben az időpontokban tudnak majd időpontot foglalni.
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleRefresh} 
          disabled={isLoading || isSaving || isRefreshing}
          className="ml-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Fontos információ</AlertTitle>
          <AlertDescription>
            Az elérhetőségi idők hetente ismétlődnek. Ha egy adott napon nem szeretnél elérhetőséget beállítani, egyszerűen ne adj hozzá időslotot arra a napra.
          </AlertDescription>
        </Alert>
        
        {isLoading || isRefreshing ? (
          <div className="text-center py-8">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p>{isRefreshing ? 'Elérhetőségi idők frissítése...' : 'Elérhetőségi idők betöltése...'}</p>
            </div>
          </div>
        ) : loadError ? (
          <div className="text-center py-6 border rounded-md bg-red-50">
            <p className="text-red-500 mb-2">{loadError}</p>
            <Button 
              variant="outline" 
              className="mt-2"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
            >
              Újrapróbálkozás
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {timeSlots.length === 0 ? (
              <div className="text-center py-6 border rounded-md bg-muted/20">
                <p className="text-muted-foreground">Még nincsenek beállított elérhetőségi idők</p>
                <p className="text-sm text-muted-foreground mt-1">Kattints az "Új időslot hozzáadása" gombra</p>
              </div>
            ) : (
              timeSlots.map((slot, index) => (
                <div key={slot.id} className="flex flex-col sm:flex-row gap-3 p-3 border rounded-md">
                  <div className="w-full sm:w-1/3">
                    <Label htmlFor={`day-${slot.id}`} className="mb-1 block">Nap</Label>
                    <Select
                      value={slot.day_of_week.toString()}
                      onValueChange={(value) => handleUpdateTimeSlot(slot.id, 'day_of_week', value)}
                    >
                      <SelectTrigger id={`day-${slot.id}`}>
                        <SelectValue placeholder="Válassz napot" />
                      </SelectTrigger>
                      <SelectContent>
                        {daysOfWeek.map((day) => (
                          <SelectItem key={day.value} value={day.value}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="w-full sm:w-1/4">
                    <Label htmlFor={`start-${slot.id}`} className="mb-1 block">Kezdés</Label>
                    <Input
                      id={`start-${slot.id}`}
                      type="time"
                      value={slot.start_time}
                      onChange={(e) => handleUpdateTimeSlot(slot.id, 'start_time', e.target.value)}
                    />
                  </div>
                  
                  <div className="w-full sm:w-1/4">
                    <Label htmlFor={`end-${slot.id}`} className="mb-1 block">Befejezés</Label>
                    <Input
                      id={`end-${slot.id}`}
                      type="time"
                      value={slot.end_time}
                      onChange={(e) => handleUpdateTimeSlot(slot.id, 'end_time', e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-end justify-end w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleRemoveTimeSlot(slot.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleAddTimeSlot}
            >
              <Plus className="h-4 w-4 mr-2" />
              Új időslot hozzáadása
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full"
          onClick={handleSaveAvailability}
          disabled={isLoading || isSaving || isRefreshing || timeSlots.length === 0}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Mentés...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Elérhetőségi idők mentése
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
