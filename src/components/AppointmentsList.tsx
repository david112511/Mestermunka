import { useState, useEffect } from 'react';
import { format, parseISO, isPast } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Calendar, Clock, MapPin, User, Check, X, CalendarX, CalendarCheck, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAppointments, Appointment, AppointmentStatus } from '@/hooks/useAppointments';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AppointmentsListProps {
  isTrainer?: boolean;
}

export default function AppointmentsList({ isTrainer = false }: AppointmentsListProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('upcoming');
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { loading, appointments, fetchAppointments, updateAppointmentStatus } = useAppointments();

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user, fetchAppointments]);

  // Foglalások szűrése
  const upcomingAppointments = appointments.filter(
    app => !isPast(parseISO(app.start_time)) && app.status !== 'cancelled' && app.status !== 'rejected'
  );
  
  const pastAppointments = appointments.filter(
    app => isPast(parseISO(app.start_time)) || app.status === 'cancelled' || app.status === 'rejected'
  );

  // Foglalás részleteinek megjelenítése
  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsDialog(true);
  };

  // Foglalás állapotának módosítása
  const handleUpdateStatus = async (appointmentId: string, status: AppointmentStatus) => {
    const success = await updateAppointmentStatus(appointmentId, status);
    
    if (success) {
      setShowDetailsDialog(false);
      setSelectedAppointment(null);
    }
  };

  // Dátum formázása
  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'yyyy. MMMM d., EEEE', { locale: hu });
  };

  // Időpont formázása
  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), 'HH:mm', { locale: hu });
  };

  // Státusz badge színe és szövege
  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', text: 'Függőben' };
      case 'confirmed':
        return { color: 'bg-green-100 text-green-800 border-green-300', text: 'Elfogadva' };
      case 'rejected':
        return { color: 'bg-red-100 text-red-800 border-red-300', text: 'Elutasítva' };
      case 'cancelled':
        return { color: 'bg-gray-100 text-gray-800 border-gray-300', text: 'Lemondva' };
      default:
        return { color: 'bg-gray-100 text-gray-800 border-gray-300', text: 'Ismeretlen' };
    }
  };

  // Foglalás kártya renderelése
  const renderAppointmentCard = (appointment: Appointment) => {
    const statusBadge = getStatusBadge(appointment.status);
    const isPastAppointment = isPast(parseISO(appointment.start_time));
    
    return (
      <Card key={appointment.id} className="mb-4 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-lg">{appointment.title}</h3>
              
              <div className="flex items-center text-sm mt-2">
                <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                <span>{formatDate(appointment.start_time)}</span>
              </div>
              
              <div className="flex items-center text-sm mt-1">
                <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                <span>{formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</span>
              </div>
              
              {appointment.location && (
                <div className="flex items-center text-sm mt-1">
                  <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                  <span>{appointment.location}</span>
                </div>
              )}
              
              <div className="flex items-center text-sm mt-1">
                <User className="h-4 w-4 mr-1 text-muted-foreground" />
                <span>
                  {isTrainer 
                    ? `Kliens: ${appointment.client?.full_name || 'Ismeretlen kliens'}`
                    : `Edző: ${appointment.trainer?.full_name || 'Ismeretlen edző'}`
                  }
                </span>
              </div>
              
              <div className="mt-2">
                <Badge className={`rounded-md ${statusBadge.color}`}>
                  {statusBadge.text}
                </Badge>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleViewDetails(appointment)}
            >
              Részletek
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming">Közelgő foglalások</TabsTrigger>
          <TabsTrigger value="past">Korábbi foglalások</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="mt-4">
          {loading ? (
            <div className="text-center py-8">
              <p>Foglalások betöltése...</p>
            </div>
          ) : upcomingAppointments.length > 0 ? (
            <ScrollArea className="h-[500px] pr-4">
              {upcomingAppointments.map(appointment => renderAppointmentCard(appointment))}
            </ScrollArea>
          ) : (
            <div className="text-center py-12">
              <CalendarX className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Nincs közelgő foglalásod</p>
              {!isTrainer && (
                <p className="text-sm text-muted-foreground mt-1">
                  Keress egy edzőt és foglalj időpontot!
                </p>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="past" className="mt-4">
          {loading ? (
            <div className="text-center py-8">
              <p>Foglalások betöltése...</p>
            </div>
          ) : pastAppointments.length > 0 ? (
            <ScrollArea className="h-[500px] pr-4">
              {pastAppointments.map(appointment => renderAppointmentCard(appointment))}
            </ScrollArea>
          ) : (
            <div className="text-center py-12">
              <CalendarX className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Nincs korábbi foglalásod</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Foglalás részletei dialógus */}
      {selectedAppointment && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Foglalás részletei</DialogTitle>
              <DialogDescription>
                {formatDate(selectedAppointment.start_time)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">{selectedAppointment.title}</h3>
                  
                  <div className="flex items-center mt-2">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{formatTime(selectedAppointment.start_time)} - {formatTime(selectedAppointment.end_time)}</span>
                  </div>
                  
                  {selectedAppointment.location && (
                    <div className="flex items-center mt-1">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{selectedAppointment.location}</span>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="flex items-center space-x-3">
                  {isTrainer ? (
                    <>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedAppointment.client?.avatar_url} alt={selectedAppointment.client?.full_name} />
                        <AvatarFallback>{selectedAppointment.client?.full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedAppointment.client?.full_name}</p>
                        <p className="text-sm text-muted-foreground">Kliens</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedAppointment.trainer?.avatar_url} alt={selectedAppointment.trainer?.full_name} />
                        <AvatarFallback>{selectedAppointment.trainer?.full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedAppointment.trainer?.full_name}</p>
                        <p className="text-sm text-muted-foreground">Edző</p>
                      </div>
                    </>
                  )}
                </div>
                
                <Separator />
                
                <div>
                  <p className="font-medium mb-1">Státusz</p>
                  <Badge className={`rounded-md ${getStatusBadge(selectedAppointment.status).color}`}>
                    {getStatusBadge(selectedAppointment.status).text}
                  </Badge>
                </div>
                
                {selectedAppointment.description && (
                  <div>
                    <p className="font-medium mb-1">Leírás</p>
                    <p className="text-sm">{selectedAppointment.description}</p>
                  </div>
                )}
                
                {selectedAppointment.notes && (
                  <div>
                    <p className="font-medium mb-1">Megjegyzések</p>
                    <p className="text-sm">{selectedAppointment.notes}</p>
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter className="flex-col sm:flex-row gap-2">
              {/* Edző: Elfogadás/Elutasítás gombok */}
              {isTrainer && selectedAppointment.status === 'pending' && (
                <>
                  <Button 
                    variant="outline" 
                    className="border-red-500 text-red-500 hover:bg-red-50"
                    onClick={() => handleUpdateStatus(selectedAppointment.id, 'rejected')}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Elutasítás
                  </Button>
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleUpdateStatus(selectedAppointment.id, 'confirmed')}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Elfogadás
                  </Button>
                </>
              )}
              
              {/* Kliens: Lemondás gomb */}
              {!isTrainer && (selectedAppointment.status === 'pending' || selectedAppointment.status === 'confirmed') && (
                <Button 
                  variant="outline" 
                  className="border-red-500 text-red-500 hover:bg-red-50"
                  onClick={() => handleUpdateStatus(selectedAppointment.id, 'cancelled')}
                >
                  <X className="h-4 w-4 mr-2" />
                  Lemondás
                </Button>
              )}
              
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                Bezárás
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
