import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, User, Dumbbell } from 'lucide-react';
import { useBooking } from '@/hooks/useBooking';
import { Booking } from '@/types';
import { format, parseISO, isPast } from 'date-fns';
import { hu } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
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

const BookingsList = () => {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [bookingsData, setBookingsData] = useState<Booking[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  
  const { bookings, loading, getBookings, cancelBooking, confirmBooking, subscribeToBookings } = useBooking();
  const { toast } = useToast();
  
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
    setBookingsData(bookings);
  }, [bookings]);
  
  // Foglalások szétválasztása közelgő és múltbeli kategóriákra
  useEffect(() => {
    const upcoming: Booking[] = [];
    const past: Booking[] = [];
    
    bookingsData.forEach(booking => {
      const startDate = parseISO(booking.start_time);
      
      if (isPast(startDate) && booking.status !== 'pending') {
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
  
  // Foglalás lemondása
  const handleCancelBooking = async () => {
    if (!selectedBookingId) return;
    
    try {
      await cancelBooking(selectedBookingId);
      toast({
        title: "Foglalás lemondva",
        description: "A foglalást sikeresen lemondtad.",
        variant: "default",
      });
    } catch (error) {
      console.error('Hiba a foglalás lemondásakor:', error);
      toast({
        title: "Hiba történt",
        description: "Nem sikerült lemondani a foglalást.",
        variant: "destructive",
      });
    } finally {
      setCancelDialogOpen(false);
      setSelectedBookingId(null);
    }
  };
  
  // Foglalás megerősítése (csak edzők számára)
  const handleConfirmBooking = async (bookingId: string) => {
    try {
      await confirmBooking(bookingId);
      toast({
        title: "Foglalás megerősítve",
        description: "A foglalást sikeresen megerősítetted.",
        variant: "default",
      });
    } catch (error) {
      console.error('Hiba a foglalás megerősítésekor:', error);
      toast({
        title: "Hiba történt",
        description: "Nem sikerült megerősíteni a foglalást.",
        variant: "destructive",
      });
    }
  };
  
  // Foglalás státusz badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200"><CheckCircle className="h-3 w-3 mr-1" /> Megerősítve</Badge>;
      case 'canceled':
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200"><XCircle className="h-3 w-3 mr-1" /> Lemondva</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200"><AlertCircle className="h-3 w-3 mr-1" /> Függőben</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Foglalás kártya
  const renderBookingCard = (booking: Booking) => {
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
                {getStatusBadge(booking.status)}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Azonosító: {booking.id.substring(0, 8)}</div>
            </div>
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
                <span>Kliens: {booking.client_id}</span>
              </div>
              <div className="flex items-center text-gray-700">
                <Dumbbell className="h-4 w-4 mr-2 text-primary" />
                <span>Edző: {booking.trainer_id}</span>
              </div>
            </div>
            
            {booking.description && (
              <div className="text-gray-700 mt-2">
                <p className="text-sm">{booking.description}</p>
              </div>
            )}
            
            {!isPastBooking && booking.status !== 'canceled' && (
              <div className="flex justify-end gap-2 mt-4">
                {booking.status === 'pending' && (
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
              A lemondás után a foglalás nem lesz elérhető, és az időpont felszabadul más ügyfelek számára.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégsem</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelBooking} className="bg-red-600 hover:bg-red-700">
              Foglalás lemondása
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BookingsList;
