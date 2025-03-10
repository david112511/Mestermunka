
import { useState } from 'react';
import Navigation from '../components/Navigation';
import CoachSearchBar from '../components/coaches/CoachSearchBar';
import CoachFilters from '../components/coaches/CoachFilters';
import CoachList from '../components/coaches/CoachList';
import CoachDetails from '../components/coaches/CoachDetails';
import { Coach, FilterOptions } from '@/types/coach';
import { useCoachData } from '@/hooks/useCoachData';
import { useCoachFilters } from '@/hooks/useCoachFilters';
import { useFilterOptions } from '@/hooks/useFilterOptions';

const Coaches = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  
  // Initialize filter options
  const filterOptions = useFilterOptions();
  
  // Fetch coach data
  const { coaches, loading, error, fetchCoaches } = useCoachData();
  
  // Initialize default filters
  const initialFilters: FilterOptions = {
    priceRange: [0, 100],
    specializations: [],
    experience: '',
    languages: [],
    rating: 0,
    minActiveClients: 0,
    certifications: [],
    education: [],
    location: []
  };
  
  // Setup filtering
  const { 
    searchTerm, 
    setSearchTerm, 
    filters, 
    setFilters, 
    filteredCoaches,
    resetFilters
  } = useCoachFilters(coaches, initialFilters);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Találd Meg a Tökéletes Edzőt</h1>
          <p className="mt-4 text-xl text-gray-600">Válogass szakértő edzőink között és kezdd el utad a célod felé</p>
        </div>

        <CoachSearchBar 
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onShowFilters={() => setShowFilters(true)}
        />

        <CoachFilters
          open={showFilters}
          onOpenChange={setShowFilters}
          filters={filters}
          onFiltersChange={setFilters}
          options={filterOptions}
        />

        <CoachList 
          coaches={filteredCoaches}
          onSelectCoach={(coach) => setSelectedCoach(coach)}
          loading={loading}
          error={error}
          onResetFilters={resetFilters}
          onReload={fetchCoaches}
          allCoachesLength={coaches.length}
        />

        <CoachDetails
          coach={selectedCoach}
          onClose={() => setSelectedCoach(null)}
        />
      </div>
    </div>
  );
};

export default Coaches;
