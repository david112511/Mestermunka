import { Star, MapPin, Clock, Users, Award, Trophy } from 'lucide-react';
import { Coach } from '@/types/coach';

interface CoachCardProps {
  coach: Coach;
  onSelect: (coach: Coach) => void;
}

const CoachCard = ({ coach, onSelect }: CoachCardProps) => {
  // Return null if coach data isn't available
  if (!coach || typeof coach !== 'object') {
    console.error("Coach data is invalid:", coach);
    return null;
  }

  // Safe access to nested properties with defaults
  const certifications = coach.certifications || [];
  
  // Properly format the name from firstName and lastName if available
  const name = coach.name && coach.name !== 'Névtelen Edző' && coach.name.trim() !== '' 
    ? coach.name 
    : 'Névtelen Edző';
    
  const specialty = coach.specialty || 'Általános edző';
  const rating = coach.rating || 0;
  const reviews = coach.reviews || 0;
  const description = coach.description || 'Nincs megadott leírás';
  const experience = coach.experience || '0';
  const activeClients = coach.activeClients || 0;
  const successStories = coach.successStories || 0;
  
  // Handling location properly - it could be a UUID
  // We display a placeholder instead of the raw UUID when it looks like one
  const locationDisplay = 
    !coach.location ? 'Nincs megadott helyszín' :
    coach.location.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ?
    'Budapest' : // Default to Budapest when we have a UUID instead of a location name
    coach.location;
  
  const availability = coach.availability || 'Nincs megadva';
  const price = coach.price || '0';
  
  // Fallback képek
  const fallbackImages = [
    "https://images.unsplash.com/photo-1517365830460-955ce3ccd263?w=300",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300",
    "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=300",
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300"
  ];
  
  // Garantáljuk, hogy mindig legyen kép - véletlenszerű ha nincs megadva
  const imageUrl = coach.image || fallbackImages[Math.floor(Math.random() * fallbackImages.length)];

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start gap-6">
          <img
            src={imageUrl}
            alt={name}
            className="w-24 h-24 rounded-xl object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              const randomIndex = Math.floor(Math.random() * fallbackImages.length);
              target.src = fallbackImages[randomIndex];
              target.onerror = null; // Prevent infinite fallback loop
            }}
          />
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{name}</h3>
                <p className="text-primary font-medium">{specialty}</p>
              </div>
              <div className="flex items-center text-yellow-400">
                <Star className="h-5 w-5 fill-current" />
                <span className="ml-1 text-gray-900 font-medium">{rating}</span>
                <span className="ml-1 text-gray-500">({reviews})</span>
              </div>
            </div>
            
            <div className="mt-4 flex items-center text-gray-600">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{locationDisplay}</span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-gray-600 line-clamp-2">{description}</p>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="flex items-center text-gray-600">
            <Clock className="h-4 w-4 mr-2" />
            <span>{experience} év tapasztalat</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Users className="h-4 w-4 mr-2" />
            <span>{activeClients} aktív ügyfél</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Trophy className="h-4 w-4 mr-2" />
            <span>{successStories} sikertörténet</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Award className="h-4 w-4 mr-2" />
            <span>{certifications.length} tanúsítvány</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {certifications.length > 0 ? (
            certifications.slice(0, 3).map((cert, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
              >
                {cert}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">Nincs megadott tanúsítvány</span>
          )}
          {certifications.length > 3 && (
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
              +{certifications.length - 3} további
            </span>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                <span>Elérhető: {availability}</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-gray-900">{price} Ft/óra</p>
            </div>
            <button 
              onClick={() => onSelect(coach)}
              className="px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
            >
              Részletek
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachCard;
