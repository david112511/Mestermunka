import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, User, Dumbbell } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useBooking } from '@/hooks/useBooking';
import { useAuth } from '@/contexts/AuthContext';
import { Booking } from '@/types';
import { format, parseISO, isPast } from 'date-fns';
import { hu } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';

// Kiegészítjük a Booking típust a kliens és edző nevével, valamint a lemondás adataival
interface ExtendedBooking extends Booking {
  client_name?: string;
  trainer_name?: string;
  cancellation_date?: string;
  cancellation_reason?: string;
}

const BookingsList = () => {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [bookingsData, setBookingsData] = useState<ExtendedBooking[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<ExtendedBooking[]>([]);
  const [pastBookings, setPastBookings] = useState<ExtendedBooking[]>([]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [isTrainer, setIsTrainer] = useState(false);
  
  const { bookings, loading, getBookings, cancelBooking, confirmBooking, subscribeToBookings } = useBooking();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Ellenőrizzük, hogy a bejelentkezett felhasználó edző-e
  useEffect(() => {
    const checkIfTrainer = async () => {
      if (!user) {
        setIsTrainer(false);
        return;
      }
      
      try {
        // Lekérdezzük a felhasználó profil adatait
        const { data, error } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error('Hiba a profil lekérdezésekor:', error);
          setIsTrainer(false);
          return;
        }
        
        // Ellenőrizzük, hogy a felhasználó edző-e (user_type = 'trainer')
        const isUserTrainer = data?.user_type === 'trainer';
        console.log('Felhasználó edző státusza:', isUserTrainer, 'user_type:', data?.user_type);
        setIsTrainer(isUserTrainer);
      } catch (error) {
        console.error('Hiba a profil lekérdezésekor:', error);
        setIsTrainer(false);
      }
    };
    
    checkIfTrainer();
  }, [user]);
  
  // Foglalások betöltése és feliratkozás a változásokra
  useEffect(() => {
    const loadBookings = async () => {
      await getBookings();
    };
    
    loadBookings();
    
    // Feliratkozás a foglalások változásaira
    const channels = subscribeToBookings((updatedBookings) => {
      setBookingsData(updatedBookings);
    });
    
    return () => {
      if (channels) {
        channels.forEach(channel => channel.unsubscribe());
      }
    };
  }, [getBookings, subscribeToBookings]);
  
  // Bookings adatok frissítése, amikor változik a bookings állapot
  useEffect(() => {
    const fetchUserNames = async () => {
      const extendedBookings = await Promise.all(
        bookings.map(async (booking) => {
          let clientName = '';
          let trainerName = '';
          
          // Kliens nevének lekérése
          if (booking.client_id) {
            const { data: clientData } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', booking.client_id)
              .single();
              
            if (clientData) {
              clientName = `${clientData.first_name} ${clientData.last_name}`;
            }
          }
          
          // Edző nevének lekérése
          if (booking.trainer_id) {
            const { data: trainerData } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', booking.trainer_id)
              .single();
              
            if (trainerData) {
              trainerName = `${trainerData.first_name} ${trainerData.last_name}`;
            }
          }
          
          return {
            ...booking,
            client_name: clientName,
            trainer_name: trainerName
          };
        })
      );
      
      setBookingsData(extendedBookings);
    };
    
    if (bookings.length > 0) {
      fetchUserNames();
    } else {
      setBookingsData([]);
    }
  }, [bookings]);
  
  // Foglalások szétválasztása közelgő és múltbeli kategóriákra
  useEffect(() => {
    const upcoming: ExtendedBooking[] = [];
    const past: ExtendedBooking[] = [];
    
    bookingsData.forEach(booking => {
      const startDate = parseISO(booking.start_time);
      
      // A lemondott foglalások mindig a múltbeli foglalások közé kerülnek
      if (booking.status === 'cancelled' || (isPast(startDate) && booking.status !== 'pending')) {
        past.push(booking);
      } else {
        upcoming.push(booking);
      }
    });
    
    setUpcomingBookings(upcoming.sort((a, b) => 
      parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime()
    ));
    
    setPastBookings(past.sort((a, b) => 
      parseISO(b.start_time).getTime() - parseISO(a.start_time).getTime()
    ));
  }, [bookingsData]);
  
  // Lemondás indoklása
  const [cancellationReason, setCancellationReason] = useState<string>('');
  
  // A useBooking hook-ot használjuk a foglalások kezeléséhez
  const { cancelBooking: cancelBookingFromHook } = useBooking();

  // Foglalás lemondása
  const handleCancelBooking = async () => {
    if (!selectedBookingId) {
      console.error('Nincs kiválasztott foglalás a lemondáshoz');
      return;
    }
    
    if (!user) {
      toast({
        title: "Bejelentkezés szükséges",
        description: "A foglalás lemondásához be kell jelentkezned.",
        variant: "destructive",
      });
      setCancelDialogOpen(false);
      setSelectedBookingId(null);
      setCancellationReason('');
      return;
    }
    
    console.log('Foglalás lemondásának kezdeményezése:', { 
      bookingId: selectedBookingId, 
      userId: user.id, 
      reason: cancellationReason || 'Nincs megadva' 
    });
    
    try {
      // Megkeressük a foglalást a helyi állapotban
      const bookingToCancel = bookingsData.find(b => b.id === selectedBookingId);
      
      if (!bookingToCancel) {
        throw new Error('A kiválasztott foglalás nem található');
      }
      
      // Ellenőrizzük, hogy a foglalás már nincs-e lemondva
      if (bookingToCancel.status === 'cancelled') {
        throw new Error('Ez a foglalás már le van mondva');
      }
      
      // Ellenőrizzük, hogy a felhasználó jogosult-e a lemondásra
      if (bookingToCancel.client_id !== user.id && bookingToCancel.trainer_id !== user.id) {
        throw new Error('Nincs jogosultságod a foglalás lemondásához');
      }
      
      // Csak helyben frissítjük a foglalás státuszát
      const now = new Date().toISOString();
      
      // Frissítjük a helyi állapotot
      const updatedBookings = bookingsData.map(booking => {
        if (booking.id === selectedBookingId) {
          // Explicit típuskonverzió a BookingStatus enum típusra
          return {
            ...booking,
            status: 'cancelled' as const, // Explicit típuskonverzió
            cancellation_date: now,
            cancellation_reason: cancellationReason || null,
            updated_at: now
          };
        }
        return booking;
      });
      
      setBookingsData(updatedBookings);
      
      // Töröljük a foglaláshoz kapcsolódó értesítéseket a helyi UI-ból
      // Ezt csak akkor tudjuk megtenni, ha van hozzáférésünk a notifications állapothoz
      
      // Szinkronizáljuk az adatbázissal a useBooking hook segítségével
      // Ez a hook már megfelelően kezeli a típuskonverziót és az értesítések törlését is
      setTimeout(async () => {
        try {
          // A cancelBookingFromHook függvény használata a hook-ból
          // Ez már tartalmazza az értesítések törlését is
          await cancelBookingFromHook(selectedBookingId, cancellationReason || undefined);
          console.log('Foglalás lemondása és kapcsolódó értesítések törlése sikeresen szinkronizálva az adatbázissal');
        } catch (syncError) {
          console.error('Hiba a foglalás lemondásának szinkronizálásakor:', syncError);
        }
      }, 500);
      
      console.log('Foglalás sikeresen lemondva (helyben):', { bookingId: selectedBookingId });
      
      toast({
        title: "Foglalás lemondva",
        description: "A foglalást sikeresen lemondtad.",
        variant: "default",
      });
    } catch (error) {
      console.error('Hiba a foglalás lemondásakor:', error);
      toast({
        title: "Hiba történt",
        description: error instanceof Error ? error.message : "Nem sikerült lemondani a foglalást.",
        variant: "destructive",
      });
    } finally {
      setCancelDialogOpen(false);
      setSelectedBookingId(null);
      setCancellationReason('');
    }
  };
  
  // Foglalás megerősítése (csak edzők számára)
  const handleConfirmBooking = async (bookingId: string) => {
    try {
      console.log('Foglalás megerősítésének kezdeményezése:', { bookingId, userId: user?.id, isTrainer });
      
      if (!user) {
        toast({
          title: "Bejelentkezés szükséges",
          description: "A foglalás megerősítéséhez be kell jelentkezned.",
          variant: "destructive",
        });
        return;
      }
      
      // Megkeressük a foglalást a helyi állapotban
      const booking = bookingsData.find(b => b.id === bookingId);
      
      if (!booking) {
        toast({
          title: "Hiba történt",
          description: "A kiválasztott foglalás nem található.",
          variant: "destructive",
        });
        return;
      }
      
      // Ellenőrizzük, hogy a felhasználó edző-e és ő-e az edző a foglalásban
      if (!isTrainer || booking.trainer_id !== user.id) {
        console.error('Jogosultsági hiba:', { isTrainer, userId: user.id, trainerId: booking.trainer_id });
        toast({
          title: "Jogosultsági hiba",
          description: "Csak a foglaláshoz tartozó edző erősítheti meg a foglalást.",
          variant: "destructive",
        });
        return;
      }
      
      const result = await confirmBooking(bookingId);
      
      if (result) {
        console.log('Foglalás sikeresen megerősítve:', { bookingId });
        toast({
          title: "Foglalás megerősítve",
          description: "A foglalást sikeresen megerősítetted.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Hiba a foglalás megerősítésekor:', error);
      toast({
        title: "Hiba történt",
        description: error instanceof Error ? error.message : "Nem sikerült megerősíteni a foglalást.",
        variant: "destructive",
      });
    }
  };
  
  // Foglalás státusz badge
  const getStatusBadge = (booking: ExtendedBooking) => {
    switch (booking.status) {
      case 'confirmed':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200"><CheckCircle className="h-3 w-3 mr-1" /> Megerősítve</Badge>;
      case 'cancelled':
        return (
          <div className="flex flex-col gap-1">
            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
              <XCircle className="h-3 w-3 mr-1" /> Lemondva
            </Badge>
            {booking.cancellation_date && (
              <span className="text-xs text-gray-500">
                {format(parseISO(booking.cancellation_date), 'yyyy.MM.dd. HH:mm')}
              </span>
            )}
          </div>
        );
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200"><AlertCircle className="h-3 w-3 mr-1" /> Függőben</Badge>;
      default:
        return <Badge variant="outline">{booking.status}</Badge>;
    }
  };
  
  // Foglalás kártya
  const renderBookingCard = (booking: ExtendedBooking) => {
    console.log('Foglalás renderelése, isTrainer értéke:', isTrainer);
    const startDate = parseISO(booking.start_time);
    const endDate = parseISO(booking.end_time);
    const isPastBooking = isPast(startDate);
    
    return (
      <Card key={booking.id} className="mb-4 overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{booking.title}</CardTitle>
              <CardDescription className="mt-1">
                {getStatusBadge(booking)}
              </CardDescription>
            </div>
            {/* Azonosító eltávolítva a jobb felső sarokból */}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center text-gray-700">
                <Calendar className="h-4 w-4 mr-2 text-primary" />
                <span>{format(startDate, 'yyyy. MMMM d. (EEEE)', { locale: hu })}</span>
              </div>
              <div className="flex items-center text-gray-700">
                <Clock className="h-4 w-4 mr-2 text-primary" />
                <span>
                  {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center text-gray-700">
                <User className="h-4 w-4 mr-2 text-primary" />
                <span>Kliens: {booking.client_name || 'N/A'}</span>
              </div>
              {/* Csak akkor mutatjuk az edző nevét, ha a bejelentkezett felhasználó nem az edző */}
              {user && booking.trainer_id !== user.id && (
                <div className="flex items-center text-gray-700">
                  <Dumbbell className="h-4 w-4 mr-2 text-primary" />
                  <span>Edző: {booking.trainer_name || 'N/A'}</span>
                </div>
              )}
            </div>
            
            {booking.description && (
              <div className="text-gray-700 mt-2">
                <p className="text-sm">{booking.description}</p>
              </div>
            )}
            
            {booking.status === 'cancelled' && booking.cancellation_reason && (
              <div className="text-gray-700 mt-2 p-3 bg-red-50 rounded-md border border-red-100">
                <p className="text-sm font-medium text-red-700 mb-1">Lemondás indoklása:</p>
                <p className="text-sm text-red-600">{booking.cancellation_reason}</p>
              </div>
            )}
            
            {!isPastBooking && booking.status !== 'cancelled' && (
              <div className="flex justify-end gap-2 mt-4">
                {/* Megerősítés gomb csak edzők számára, és csak akkor, ha a foglalás függőben van és a bejelentkezett felhasználó az edző */}
                {booking.status === 'pending' && isTrainer && user && booking.trainer_id === user.id && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-green-600 border-green-200 hover:bg-green-50"
                    onClick={() => handleConfirmBooking(booking.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Megerősítés
                  </Button>
                )}
                
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => {
                    setSelectedBookingId(booking.id);
                    setCancelDialogOpen(true);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Lemondás
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };
  
  // Betöltési állapot
  if (loading && bookingsData.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="mb-4 overflow-hidden">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/3 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Skeleton className="h-9 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="upcoming">Közelgő foglalások</TabsTrigger>
          <TabsTrigger value="past">Korábbi foglalások</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming">
          {upcomingBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nincsenek közelgő foglalásaid.
            </div>
          ) : (
            <div>
              {upcomingBookings.map(renderBookingCard)}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="past">
          {pastBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nincsenek korábbi foglalásaid.
            </div>
          ) : (
            <div>
              {pastBookings.map(renderBookingCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Biztosan lemondod a foglalást?</AlertDialogTitle>
            <AlertDialogDescription>
              Ez a művelet nem vonható vissza. A foglalás lemondásra kerül.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="mb-4">
            <label htmlFor="cancellation-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Lemondás indoklása (opcionális):
            </label>
            <textarea
              id="cancellation-reason"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
              placeholder="Add meg a lemondás okát..."
              rows={3}
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Mégsem</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelBooking} className="bg-red-500 hover:bg-red-600">
              Lemondás
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BookingsList;
