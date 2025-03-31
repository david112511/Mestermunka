import { useState, useEffect } from 'react';
import { format, addDays, setHours, setMinutes, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, MapPin, User, CalendarCheck, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAppointments, TrainerAvailability, AppointmentFormData } from '@/hooks/useAppointments';

interface AppointmentBookingProps {
  trainerId: string;
  trainerName: string;
  trainerAvatar?: string;
}

export default function AppointmentBooking({ trainerId, trainerName, trainerAvatar }: AppointmentBookingProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [availableTimeSlots, setAvailableTimeSlots] = useState<{ start: Date; end: Date }[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [formData, setFormData] = useState<AppointmentFormData>({
    title: `Edzés ${trainerName}-val`,
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const { fetchTrainerAvailability, createAppointment } = useAppointments();

  // Edző elérhetőségeinek lekérése
  useEffect(() => {
    if (!trainerId || !date) return;

    const fetchAvailability = async () => {
      setIsLoading(true);
      try {
        const availability = await fetchTrainerAvailability(trainerId);
        
        if (availability.length === 0) {
          setAvailableTimeSlots([]);
          return;
        }

        // A kiválasztott napra vonatkozó elérhetőségek szűrése
        const dayOfWeek = date.getDay();
        const dayAvailability = availability.filter(slot => slot.day_of_week === dayOfWeek);
        
        if (dayAvailability.length === 0) {
          setAvailableTimeSlots([]);
          return;
        }

        // Időslotok generálása 1 órás blokkokban
        const slots: { start: Date; end: Date }[] = [];
        
        dayAvailability.forEach(slot => {
          const [startHour, startMinute] = slot.start_time.split(':').map(Number);
          const [endHour, endMinute] = slot.end_time.split(':').map(Number);
          
          const startDate = new Date(date);
          startDate.setHours(startHour, startMinute, 0, 0);
          
          const endDate = new Date(date);
          endDate.setHours(endHour, endMinute, 0, 0);
          
          // 1 órás slotok generálása
          let currentStart = new Date(startDate);
          
          while (isBefore(currentStart, endDate) || currentStart.getTime() === endDate.getTime()) {
            const currentEnd = new Date(currentStart);
            currentEnd.setHours(currentStart.getHours() + 1);
            
            // Csak akkor adjuk hozzá, ha a teljes slot belefér az elérhetőségi időbe
            if (isBefore(currentEnd, endDate) || currentEnd.getTime() === endDate.getTime()) {
              slots.push({
                start: new Date(currentStart),
                end: new Date(currentEnd)
              });
            }
            
            // Következő slot kezdete
            currentStart.setHours(currentStart.getHours() + 1);
          }
        });

        // Rendezzük az időslotokat
        slots.sort((a, b) => a.start.getTime() - b.start.getTime());
        
        setAvailableTimeSlots(slots);
      } catch (error) {
        console.error('Hiba az elérhetőségek lekérésekor:', error);
        toast({
          title: 'Hiba történt',
          description: 'Nem sikerült betölteni az edző elérhetőségeit.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailability();
  }, [trainerId, date, fetchTrainerAvailability, toast]);

  // Időslot kiválasztása
  const handleSelectTimeSlot = (slot: { start: Date; end: Date }) => {
    setSelectedTimeSlot(slot);
    
    // Form adatok frissítése
    setFormData({
      ...formData,
      start_time: slot.start.toISOString(),
      end_time: slot.end.toISOString(),
    });
    
    setShowBookingForm(true);
  };

  // Foglalás elküldése
  const handleSubmitBooking = async () => {
    if (!user) {
      toast({
        title: 'Nincs bejelentkezve',
        description: 'Az időpontfoglaláshoz be kell jelentkezni.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.title || !formData.start_time || !formData.end_time) {
      toast({
        title: 'Hiányzó adatok',
        description: 'Kérjük, töltsd ki a kötelező mezőket.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await createAppointment(trainerId, formData);
      
      if (result) {
        setShowBookingForm(false);
        setSelectedTimeSlot(null);
        setFormData({
          title: `Edzés ${trainerName}-val`,
          description: '',
          start_time: '',
          end_time: '',
          location: '',
          notes: '',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Dátum formázása
  const formatDate = (date: Date) => {
    return format(date, 'yyyy. MMMM d., EEEE', { locale: hu });
  };

  // Időpont formázása
  const formatTime = (date: Date) => {
    return format(date, 'HH:mm', { locale: hu });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Időpontfoglalás</CardTitle>
          <CardDescription>
            Foglalj időpontot {trainerName} edzővel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="mb-2 block">Válassz dátumot</Label>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
                className="rounded-md border shadow"
              />
            </div>
            
            <div>
              <Label className="mb-2 block">Elérhető időpontok</Label>
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <p>Időpontok betöltése...</p>
                </div>
              ) : availableTimeSlots.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-1">
                  {availableTimeSlots.map((slot, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className={`justify-start ${selectedTimeSlot && selectedTimeSlot.start.getTime() === slot.start.getTime() ? 'border-primary bg-primary/10' : ''}`}
                      onClick={() => handleSelectTimeSlot(slot)}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      {formatTime(slot.start)} - {formatTime(slot.end)}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <Info className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Ezen a napon nincs elérhető időpont</p>
                  <p className="text-sm text-muted-foreground mt-1">Válassz másik napot a naptárból</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Foglalási űrlap dialógus */}
      <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Időpontfoglalás</DialogTitle>
            <DialogDescription>
              Töltsd ki az alábbi adatokat a foglalás véglegesítéséhez.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTimeSlot && (
            <div className="grid gap-4 py-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="booking-date">Időpont</Label>
                <div className="flex items-center border rounded-md p-2 bg-muted/50">
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(selectedTimeSlot.start)}</span>
                </div>
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="booking-time">Időtartam</Label>
                <div className="flex items-center border rounded-md p-2 bg-muted/50">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{formatTime(selectedTimeSlot.start)} - {formatTime(selectedTimeSlot.end)}</span>
                </div>
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="booking-trainer">Edző</Label>
                <div className="flex items-center border rounded-md p-2 bg-muted/50">
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{trainerName}</span>
                </div>
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="booking-title">Foglalás címe *</Label>
                <Input
                  id="booking-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Pl. Személyi edzés"
                />
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="booking-location">Helyszín</Label>
                <Input
                  id="booking-location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Pl. FitConnect Edzőterem"
                />
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="booking-description">Leírás</Label>
                <Textarea
                  id="booking-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Rövid leírás az edzésről..."
                  className="min-h-[80px]"
                />
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="booking-notes">Megjegyzések az edzőnek</Label>
                <Textarea
                  id="booking-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Egyéb megjegyzések, kérések..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookingForm(false)}>Mégsem</Button>
            <Button onClick={handleSubmitBooking} disabled={isLoading}>
              {isLoading ? 'Foglalás...' : 'Foglalás megerősítése'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
