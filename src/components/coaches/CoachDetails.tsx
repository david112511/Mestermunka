import { Star, MapPin, Mail, Phone, Globe2, Calendar, Clock, Trophy, Users, Award, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Coach } from '@/types/coach';

interface CoachDetailsProps {
  coach: Coach | null;
  onClose: () => void;
}

const CoachDetails = ({ coach, onClose }: CoachDetailsProps) => {
  if (!coach) return null;

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
                <span className="ml-1 text-gray-500">({coach.reviews} reviews)</span>
              </div>
              <div className="mt-2 flex items-center text-gray-600">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{coach.location}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center text-gray-600">
                <Mail className="h-4 w-4 mr-2" />
                <span>{coach.email}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Phone className="h-4 w-4 mr-2" />
                <span>{coach.phone}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Globe2 className="h-4 w-4 mr-2" />
                <span>Languages: {coach.languages.join(", ")}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                <span>Available: {coach.availability}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-lg mb-2">About Me</h4>
              <p className="text-gray-600 whitespace-pre-line">{coach.fullBio}</p>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-lg mb-2">Education & Certifications</h4>
              <div className="space-y-2">
                {coach.education.map((edu: string, index: number) => (
                  <div key={index} className="flex items-center text-gray-600">
                    <Award className="h-4 w-4 mr-2" />
                    <span>{edu}</span>
                  </div>
                ))}
                <div className="mt-2 flex flex-wrap gap-2">
                  {coach.certifications.map((cert: string, index: number) => (
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
              <h4 className="font-semibold text-lg mb-2">Areas of Specialization</h4>
              <div className="flex flex-wrap gap-2">
                {coach.specializationAreas.map((area: string, index: number) => (
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
              <h4 className="font-semibold text-lg mb-2">Experience & Achievement</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">{coach.experience}</p>
                  <p className="text-sm text-gray-600">Experience</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">{coach.activeClients}</p>
                  <p className="text-sm text-gray-600">Active Clients</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">{coach.successStories}</p>
                  <p className="text-sm text-gray-600">Success Stories</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 flex justify-between items-center">
              <div>
                <p className="text-gray-600">Hourly Rate</p>
                <p className="text-3xl font-bold text-gray-900">${coach.price}</p>
              </div>
              <button className="px-8 py-4 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors">
                Schedule Session
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CoachDetails;
