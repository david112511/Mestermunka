import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useBooking } from '@/hooks/useBooking';
import { useTrainerServices } from '@/hooks/useTrainerServices';
import { Service, TimeSlot } from '@/types';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Check, ChevronLeft, ChevronRight, Clock, CreditCard, Calendar as CalendarIcon, Dumbbell } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface BookingWizardProps {
  trainerId: string;
  onClose: () => void;
  onSuccess?: (bookingId: string) => void;
}

const BookingWizard = ({ trainerId, onClose, onSuccess }: BookingWizardProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { services, loading: servicesLoading } = useTrainerServices(trainerId);
  const { getAvailableSlots, getAvailableDates, availableDates, createBooking, loading: bookingLoading } = useBooking();

  // Lépések kezelése
  const [currentStep, setCurrentStep] = useState(0);
  const steps = ['Szolgáltatás', 'Időpont', 'Adatok', 'Visszaigazolás'];

  // Kiválasztott adatok
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [bookingNote, setBookingNote] = useState('');
  const [bookingId, setBookingId] = useState<string | null>(null);
  
  // Elérhető dátumok betöltése, amikor szolgáltatást választunk
  useEffect(() => {
    if (selectedService) {
      const loadAvailableDates = async () => {
        const today = new Date();
        await getAvailableDates(trainerId, today);
      };
      
      loadAvailableDates();
    }
  }, [selectedService, trainerId, getAvailableDates]);

  // Időpontok betöltése dátum kiválasztásakor
  useEffect(() => {
    const loadTimeSlots = async () => {
      if (selectedService && selectedDate) {
        try {
          const slots = await getAvailableSlots(trainerId, selectedService.id, selectedDate);
          setAvailableSlots(slots);
        } catch (error) {
          console.error('Hiba az időpontok betöltésekor:', error);
          toast({
            title: 'Hiba történt',
            description: 'Nem sikerült betölteni az elérhető időpontokat.',
            variant: 'destructive',
          });
        }
      }
    };

    loadTimeSlots();
  }, [selectedDate, selectedService, trainerId, getAvailableSlots, toast]);

  // Foglalás létrehozása
  const handleCreateBooking = async () => {
    if (!selectedService || !selectedSlot || !user || !profile) {
      toast({
        title: 'Hiányzó adatok',
        description: 'Kérjük, válassz szolgáltatást és időpontot, valamint jelentkezz be.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // A createBooking függvény 6 paramétert vár, nem objektumot
      const booking = await createBooking(
        trainerId,
        selectedService.id,
        selectedSlot.start_time,
        (profile.first_name && profile.last_name) ? `${profile.first_name} ${profile.last_name}` : (user.email?.split('@')[0] || 'Névtelen felhasználó'),
        user.email || '',
        bookingNote
      );

      if (booking && booking.id) {
        setBookingId(booking.id);
        setCurrentStep(3); // Ugrás a visszaigazolás lépésre
        
        if (onSuccess) {
          onSuccess(booking.id);
        }
      } else {
        throw new Error('Nem sikerült létrehozni a foglalást');
      }
    } catch (error) {
      console.error('Hiba a foglalás létrehozásakor:', error);
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült létrehozni a foglalást.',
        variant: 'destructive',
      });
    }
  };

  // Navigációs gombok
  const handleNext = () => {
    if (currentStep === 0 && !selectedService) {
      toast({
        title: 'Válassz szolgáltatást',
        description: 'Kérjük, válassz egy szolgáltatást a folytatáshoz.',
        variant: 'destructive',
      });
      return;
    }

    if (currentStep === 1 && !selectedSlot) {
      toast({
        title: 'Válassz időpontot',
        description: 'Kérjük, válassz egy elérhető időpontot a folytatáshoz.',
        variant: 'destructive',
      });
      return;
    }

    if (currentStep === 2) {
      handleCreateBooking();
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  // Szolgáltatás kiválasztása
  const renderServiceSelection = () => {
    if (servicesLoading) {
      return <div className="py-8 text-center text-gray-500">Szolgáltatások betöltése...</div>;
    }

    if (!services || services.length === 0) {
      return (
        <div className="py-8 text-center text-gray-500">
          Nincsenek elérhető szolgáltatások ennél az edzőnél.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <RadioGroup value={selectedService?.id} onValueChange={(value) => {
          const service = services.find(s => s.id === value);
          setSelectedService(service || null);
        }}>
          {services.map((service) => (
            <div 
              key={service.id}
              className={`border rounded-lg p-4 transition-all ${
                selectedService?.id === service.id ? 'border-primary bg-primary/5' : 'hover:border-gray-300'
              }`}
            >
              <RadioGroupItem value={service.id} id={service.id} className="sr-only" />
              <Label htmlFor={service.id} className="flex items-start cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-lg">{service.name}</h3>
                    <Badge variant="outline" className="ml-2">
                      {service.duration} perc
                    </Badge>
                  </div>
                  <p className="text-gray-500 mt-1">{service.description}</p>
                  <div className="flex items-center mt-2 text-primary font-medium">
                    {service.price.toLocaleString('hu-HU')} Ft
                  </div>
                </div>
                {selectedService?.id === service.id && (
                  <div className="ml-4 flex-shrink-0">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    );
  };

  // Időpont kiválasztása
  const renderTimeSelection = () => {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Válassz dátumot</h3>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={hu}
            className="border rounded-md p-3"
            disabled={(date) => {
              // Múltbeli dátumok és nem elérhető napok tiltása
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              if (date < today) return true;
              
              // Ellenőrizzük, hogy a dátum szerepel-e az elérhető dátumok között
              return !availableDates.some(availableDate => 
                availableDate.getFullYear() === date.getFullYear() &&
                availableDate.getMonth() === date.getMonth() &&
                availableDate.getDate() === date.getDate()
              );
            }}
          />
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Elérhető időpontok</h3>
          {!selectedDate ? (
            <div className="text-gray-500 py-4">Válassz egy dátumot a naptárból</div>
          ) : bookingLoading ? (
            <div className="text-gray-500 py-4 flex items-center">
              <Clock className="animate-spin h-4 w-4 mr-2" />
              Időpontok betöltése...
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="text-gray-500 py-4">Nincsenek elérhető időpontok a kiválasztott napon</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableSlots.map((slot, index) => (
                <Button
                  key={index}
                  variant={selectedSlot?.start_time === slot.start_time ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setSelectedSlot(slot)}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {format(new Date(slot.start_time), 'HH:mm')}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Adatok megadása
  const renderBookingDetails = () => {
    return (
      <div className="space-y-6">
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-medium mb-2">Foglalás összegzése</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Szolgáltatás:</span>
              <span className="font-medium">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Időtartam:</span>
              <span>{selectedService?.duration} perc</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Időpont:</span>
              <span>
                {selectedDate && format(selectedDate, 'yyyy. MMMM d.', { locale: hu })}
                {selectedSlot && `, ${format(new Date(selectedSlot.start_time), 'HH:mm')}`}
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-gray-500">Ár:</span>
              <span className="text-primary">{selectedService?.price.toLocaleString('hu-HU')} Ft</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="note">Megjegyzés (opcionális)</Label>
            <Textarea
              id="note"
              placeholder="Ha van bármilyen kérdésed vagy megjegyzésed a foglalással kapcsolatban..."
              value={bookingNote}
              onChange={(e) => setBookingNote(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      </div>
    );
  };

  // Visszaigazolás
  const renderConfirmation = () => {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        
        <div>
          <h3 className="text-xl font-medium">Sikeres foglalás!</h3>
          <p className="text-gray-500 mt-1">
            Foglalásod sikeresen rögzítettük. Az edző hamarosan visszaigazolja.
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-gray-50 text-left">
          <h4 className="font-medium mb-2">Foglalás részletei</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Azonosító:</span>
              <span className="font-mono text-sm">{bookingId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Szolgáltatás:</span>
              <span>{selectedService?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Időpont:</span>
              <span>
                {selectedDate && format(selectedDate, 'yyyy. MMMM d.', { locale: hu })}
                {selectedSlot && `, ${format(new Date(selectedSlot.start_time), 'HH:mm')}`}
              </span>
            </div>
          </div>
        </div>

        <Button onClick={onClose} className="w-full">
          Bezárás
        </Button>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Időpontfoglalás</CardTitle>
        <CardDescription>
          Foglalj időpontot az edzőhöz néhány egyszerű lépésben
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Lépések megjelenítése */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep === index 
                      ? 'bg-primary text-white' 
                      : currentStep > index 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {currentStep > index ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span className={`text-xs mt-1 ${currentStep === index ? 'text-primary font-medium' : 'text-gray-500'}`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
          <div className="relative mt-2">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100">
              <div 
                className="h-1 bg-primary transition-all" 
                style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Aktuális lépés tartalma */}
        <div className="min-h-[300px]">
          {currentStep === 0 && renderServiceSelection()}
          {currentStep === 1 && renderTimeSelection()}
          {currentStep === 2 && renderBookingDetails()}
          {currentStep === 3 && renderConfirmation()}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {currentStep < 3 ? (
          <>
            <Button 
              variant="outline" 
              onClick={currentStep === 0 ? onClose : handleBack}
            >
              {currentStep === 0 ? 'Mégse' : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Vissza
                </>
              )}
            </Button>
            <Button onClick={handleNext} disabled={bookingLoading}>
              {currentStep === 2 ? (
                bookingLoading ? 'Foglalás...' : 'Foglalás véglegesítése'
              ) : (
                <>
                  Tovább
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </>
        ) : null}
      </CardFooter>
    </Card>
  );
};

export default BookingWizard;
