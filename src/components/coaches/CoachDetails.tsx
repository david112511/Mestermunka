import { Star, MapPin, Mail, Phone, Globe2, Calendar, Clock, Trophy, Users, Award, X, MessageCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Coach } from '@/types/coach';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import BookingWizard from '@/components/booking/BookingWizard';
import { useState } from 'react';

interface CoachDetailsProps {
  coach: Coach | null;
  onClose: () => void;
}

const CoachDetails = ({ coach, onClose }: CoachDetailsProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createOrFindConversation, setCurrentConversation } = useMessages();
  const { toast } = useToast();
  const [showBookingWizard, setShowBookingWizard] = useState(false);
  
  if (!coach) return null;

  const handleStartConversation = async () => {
    if (!user) {
      toast({
        title: "Bejelentkezés szükséges",
        description: "Üzenetküldéshez kérjük, jelentkezz be.",
        variant: "destructive",
      });
      return;
    }

    if (!coach.id) {
      toast({
        title: "Hiba történt",
        description: "Az edző azonosítója hiányzik.",
        variant: "destructive",
      });
      return;
    }

    try {
      const conversationId = await createOrFindConversation(String(coach.id));
      if (conversationId) {
        onClose();
        navigate('/messages');
        setCurrentConversation(conversationId as string);
      }
    } catch (error) {
      console.error("Hiba a beszélgetés létrehozásakor:", error);
      toast({
        title: "Hiba történt",
        description: "Nem sikerült létrehozni a beszélgetést.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={!!coach} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{coach.name}</DialogTitle>
        </DialogHeader>
        
        <div className="mt-6">
          <div className="flex items-start gap-6">
            <img
              src={coach.image}
              alt={coach.name}
              className="w-32 h-32 rounded-xl object-cover"
            />
            <div>
              <h3 className="text-xl font-semibold text-primary">{coach.specialty}</h3>
              <div className="mt-2 flex items-center text-yellow-400">
                <Star className="h-5 w-5 fill-current" />
                <span className="ml-1 text-gray-900 font-medium">{coach.rating}</span>
                <span className="ml-1 text-gray-500">({coach.reviews} értékelés)</span>
              </div>
              <div className="mt-2 flex items-center text-gray-600">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{coach.location}</span>
              </div>
              {coach.email && (
                <div className="mt-2 flex items-center text-gray-600">
                  <Mail className="h-4 w-4 mr-1" />
                  <span>{coach.email}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coach.email && (
                <div className="flex items-center text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  <span>{coach.email}</span>
                </div>
              )}
              {coach.phone && (
                <div className="flex items-center text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  <span>{coach.phone}</span>
                </div>
              )}
              {coach.languages && coach.languages.length > 0 && (
                <div className="flex items-center text-gray-600">
                  <Globe2 className="h-4 w-4 mr-2" />
                  <span>Nyelvek: {coach.languages.join(", ")}</span>
                </div>
              )}
              <div className="flex items-center text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                <span>Elérhető: {coach.availability}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-lg mb-2">Rólam</h4>
              <p className="text-gray-600 whitespace-pre-line">{coach.fullBio}</p>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-lg mb-2">Képzettség & Tanúsítványok</h4>
              <div className="space-y-2">
                {coach.education && coach.education.map((edu: string, index: number) => (
                  <div key={index} className="flex items-center text-gray-600">
                    <Award className="h-4 w-4 mr-2" />
                    <span>{edu}</span>
                  </div>
                ))}
                <div className="mt-2 flex flex-wrap gap-2">
                  {coach.certifications && coach.certifications.map((cert: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                    >
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-lg mb-2">Szakterületek</h4>
              <div className="flex flex-wrap gap-2">
                {coach.specializationAreas && coach.specializationAreas.map((area: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-lg mb-2">Tapasztalat & Eredmények</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">{coach.experience} év</p>
                  <p className="text-sm text-gray-600">Tapasztalat</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">{coach.activeClients}</p>
                  <p className="text-sm text-gray-600">Aktív ügyfelek</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">{coach.successStories}</p>
                  <p className="text-sm text-gray-600">Sikertörténetek</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div>
                <p className="text-gray-600">Óradíj</p>
                <p className="text-3xl font-bold text-gray-900">{coach.price} Ft</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-between">
          <Button 
            className="flex items-center gap-2" 
            onClick={handleStartConversation}
          >
            <MessageCircle className="h-4 w-4" />
            Üzenet küldése
          </Button>
          <Button 
            variant="default" 
            className="flex items-center gap-2 bg-primary hover:bg-primary/90"
            onClick={() => setShowBookingWizard(true)}
          >
            <Calendar className="h-4 w-4" />
            Időpontfoglalás
          </Button>
        </div>
        
        {showBookingWizard && (
          <Dialog open={showBookingWizard} onOpenChange={setShowBookingWizard}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
              <BookingWizard 
                trainerId={String(coach.id)} 
                onClose={() => setShowBookingWizard(false)}
                onSuccess={(bookingId) => {
                  setShowBookingWizard(false);
                  toast({
                    title: "Sikeres foglalás",
                    description: `A foglalás azonosítója: ${bookingId}`,
                    variant: "default",
                  });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CoachDetails;
