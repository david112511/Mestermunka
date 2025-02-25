
import { Star, MapPin, Clock, Users, Award, Trophy } from 'lucide-react';

interface Coach {
  id: number;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  image: string;
  price: string;
  experience: string;
  location: string;
  certifications: string[];
  availability: string;
  activeClients: number;
  successStories: number;
  description: string;
}

interface CoachCardProps {
  coach: Coach;
  onSelect: (coach: Coach) => void;
}

const CoachCard = ({ coach, onSelect }: CoachCardProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start gap-6">
          <img
            src={coach.image}
            alt={coach.name}
            className="w-24 h-24 rounded-xl object-cover"
          />
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{coach.name}</h3>
                <p className="text-primary font-medium">{coach.specialty}</p>
              </div>
              <div className="flex items-center text-yellow-400">
                <Star className="h-5 w-5 fill-current" />
                <span className="ml-1 text-gray-900 font-medium">{coach.rating}</span>
                <span className="ml-1 text-gray-500">({coach.reviews})</span>
              </div>
            </div>
            
            <div className="mt-4 flex items-center text-gray-600">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{coach.location}</span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-gray-600 line-clamp-2">{coach.description}</p>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="flex items-center text-gray-600">
            <Clock className="h-4 w-4 mr-2" />
            <span>{coach.experience} experience</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Users className="h-4 w-4 mr-2" />
            <span>{coach.activeClients} active clients</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Trophy className="h-4 w-4 mr-2" />
            <span>{coach.successStories} success stories</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Award className="h-4 w-4 mr-2" />
            <span>{coach.certifications.length} certifications</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {coach.certifications.map((cert, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
            >
              {cert}
            </span>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                <span>Available: {coach.availability}</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-gray-900">${coach.price}/hour</p>
            </div>
            <button 
              onClick={() => onSelect(coach)}
              className="px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
            >
              Book Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachCard;
