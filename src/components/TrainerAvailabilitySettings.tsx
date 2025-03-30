import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Clock, Plus, Save, Trash2, Info } from 'lucide-react';
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

export default function TrainerAvailabilitySettings() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Elérhetőségi idők beállítása</CardTitle>
        <CardDescription>
          Add meg, hogy mikor vagy elérhető edzésekre. A kliensek csak ezekben az időpontokban tudnak majd időpontot foglalni.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Fontos információ</AlertTitle>
          <AlertDescription>
            Az elérhetőségi idők hetente ismétlődnek. Ha egy adott napon nem szeretnél elérhetőséget beállítani, egyszerűen ne adj hozzá időslotot arra a napra.
          </AlertDescription>
        </Alert>
        
        {isLoading ? (
          <div className="text-center py-8">
            <p>Elérhetőségi idők betöltése...</p>
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
          disabled={isLoading || isSaving || timeSlots.length === 0}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Mentés...' : 'Elérhetőségi idők mentése'}
        </Button>
      </CardFooter>
    </Card>
  );
}
