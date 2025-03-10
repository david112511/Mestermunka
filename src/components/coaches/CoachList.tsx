
import { RefreshCw } from 'lucide-react';
import { Coach } from '@/types/coach';
import CoachCard from './CoachCard';
import { Card } from "@/components/ui/card";

interface CoachListProps {
  coaches: Coach[];
  onSelectCoach: (coach: Coach) => void;
  loading: boolean;
  error: string | null;
  onResetFilters: () => void;
  onReload: () => void;
  allCoachesLength: number;
}

const CoachList = ({ 
  coaches, 
  onSelectCoach, 
  loading, 
  error, 
  onResetFilters,
  onReload,
  allCoachesLength
}: CoachListProps) => {
  
  if (loading) {
    return (
      <div className="mt-12 text-center py-12">
        <p className="text-gray-500 text-lg">Edzők betöltése...</p>
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="p-6 animate-pulse">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 rounded-xl bg-gray-200"></div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
              <div className="mt-4 h-16 bg-gray-200 rounded"></div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-6 bg-gray-200 rounded w-16"></div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between">
                <div className="w-1/3">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-1/3 h-10 bg-gray-200 rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="mt-12 text-center py-12">
        <p className="text-red-500 text-lg">{error}</p>
        <button
          onClick={onReload}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center justify-center mx-auto"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Újrapróbálkozás
        </button>
      </div>
    );
  }
  
  if (coaches && coaches.length > 0) {
    return (
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {coaches.map((coach) => (
          <CoachCard
            key={coach.id}
            coach={coach}
            onSelect={() => onSelectCoach(coach)}
          />
        ))}
      </div>
    );
  }
  
  if (allCoachesLength > 0) {
    return (
      <div className="text-center py-12 mt-6">
        <p className="text-gray-500 text-lg">
          Nincs a keresési feltételeknek megfelelő edző.
        </p>
        <button
          onClick={onResetFilters}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          Összes edző mutatása
        </button>
      </div>
    );
  }
  
  return (
    <div className="text-center py-12 mt-6">
      <p className="text-gray-500 text-lg">
        Még nincsenek regisztrált edzők az adatbázisban.
      </p>
    </div>
  );
};

export default CoachList;
