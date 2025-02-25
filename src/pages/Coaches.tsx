import { useState, useMemo, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import Navigation from '../components/Navigation';
import CoachCard from '../components/coaches/CoachCard';
import CoachFilters from '../components/coaches/CoachFilters';
import CoachDetails from '../components/coaches/CoachDetails';
import { Coach, FilterOptions } from '@/types/coach';
import { supabase } from '@/lib/supabase';

const Coaches = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    priceRange: [0, 100],
    specializations: [],
    experience: '',
    languages: [],
    rating: 0,
    minActiveClients: 0,
    certifications: [],
    education: [],
    location: []
  });

  const [filterOptions, setFilterOptions] = useState({
    specializations: [],
    languageOptions: [],
    experienceOptions: [
      { value: "0-2", label: "0-2 év" },
      { value: "3-5", label: "3-5 év" },
      { value: "5-10", label: "5-10 év" },
      { value: "10+", label: "10+ év" }
    ],
    certificationOptions: [],
    educationOptions: [],
    locationOptions: []
  });

  useEffect(() => {
    const fetchPresetOptions = async () => {
      try {
        const [specializations, languages, certifications, educations, locations] = await Promise.all([
          supabase.from('specializations').select('id, name'),
          supabase.from('languages').select('id, name'),
          supabase.from('certifications').select('id, name'),
          supabase.from('education_types').select('id, name'),
          supabase.from('locations').select('id, name')
        ]);

        setFilterOptions({
          ...filterOptions,
          specializations: specializations.data?.map(s => s.name) || [],
          languageOptions: languages.data?.map(l => l.name) || [],
          certificationOptions: certifications.data?.map(c => c.name) || [],
          educationOptions: educations.data?.map(e => e.name) || [],
          locationOptions: locations.data?.map(l => l.name) || []
        });
      } catch (error) {
        console.error('Hiba történt az adatok betöltésekor:', error);
      }
    };

    fetchPresetOptions();
  }, []);

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        console.log('Fetching trainers...');
        const { data: trainers, error } = await supabase
          .from('trainers')
          .select(`
            *,
            profiles!trainers_id_fkey (
              first_name,
              last_name,
              avatar_url
            ),
            trainer_specializations!trainer_specializations_trainer_id_fkey (
              specializations (
                name
              )
            ),
            trainer_languages!trainer_languages_trainer_id_fkey (
              languages (
                name
              )
            ),
            trainer_certifications!trainer_certifications_trainer_id_fkey (
              certifications (
                name
              )
            ),
            trainer_education!trainer_education_trainer_id_fkey (
              education:education_types (
                name
              )
            )
          `);

        if (error) {
          console.error('Error fetching trainers:', error);
          throw error;
        }

        console.log('Raw trainers data:', trainers);

        const formattedCoaches = trainers?.map(trainer => {
          console.log('Processing trainer:', trainer);
          return {
            id: trainer.id,
            name: `${trainer.profiles?.first_name || ''} ${trainer.profiles?.last_name || ''}`.trim() || 'Névtelen Edző',
            specialty: trainer.trainer_specializations?.[0]?.specializations?.name || 'Általános edző',
            rating: trainer.rating || 0,
            reviews: trainer.reviews || 0,
            image: trainer.profiles?.avatar_url || "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300",
            price: trainer.price || "0",
            experience: trainer.experience || "0",
            location: trainer.location || "Nem megadott",
            certifications: trainer.trainer_certifications?.map(tc => tc.certifications.name) || [],
            availability: trainer.availability || "Nem megadott",
            activeClients: trainer.active_clients || 0,
            successStories: trainer.success_stories || 0,
            description: trainer.description || "Nincs megadott leírás",
            languages: trainer.trainer_languages?.map(tl => tl.languages.name) || [],
            email: "", // Email címet nem jelenítünk meg biztonsági okokból
            phone: "", // Telefonszámot nem jelenítünk meg biztonsági okokból
            specializationAreas: trainer.trainer_specializations?.map(ts => ts.specializations.name) || [],
            education: trainer.trainer_education?.map(te => te.education.name) || [],
            fullBio: trainer.full_bio || "Nincs megadott részletes leírás"
          };
        }) || [];

        console.log('Formatted coaches:', formattedCoaches);
        setCoaches(formattedCoaches);
      } catch (error) {
        console.error('Hiba történt az edzők betöltésekor:', error);
      }
    };

    fetchCoaches();
  }, []);

  const filteredCoaches = useMemo(() => {
    console.log('Filtering coaches:', coaches, 'with searchTerm:', searchTerm, 'and filters:', filters);
    return coaches.filter(coach => {
      // Keresési szűrő
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        coach.name.toLowerCase().includes(searchLower) ||
        coach.specialty.toLowerCase().includes(searchLower) ||
        coach.location.toLowerCase().includes(searchLower) ||
        coach.description.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Ár szűrő
      const price = parseInt(coach.price);
      if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false;

      // Értékelés szűrő
      if (coach.rating < filters.rating) return false;

      // Tapasztalat szűrő
      if (filters.experience && parseInt(coach.experience) < parseInt(filters.experience)) return false;

      // Aktív ügyfelek szűrő
      if (coach.activeClients < filters.minActiveClients) return false;

      // Specializáció szűrő
      if (filters.specializations.length > 0 && 
          !filters.specializations.some(spec => coach.specializationAreas.includes(spec))) return false;

      // Tanúsítvány szűrő
      if (filters.certifications.length > 0 && 
          !filters.certifications.some(cert => coach.certifications.includes(cert))) return false;

      // Végzettség szűrő
      if (filters.education.length > 0 && 
          !filters.education.some(edu => coach.education.includes(edu))) return false;

      // Helyszín szűrő
      if (filters.location.length > 0 && 
          !filters.location.includes(coach.location)) return false;

      // Nyelv szűrő
      if (filters.languages.length > 0 && 
          !filters.languages.some(lang => coach.languages.includes(lang))) return false;

      return true;
    });
  }, [coaches, searchTerm, filters]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Találd Meg a Tökéletes Edzőt</h1>
          <p className="mt-4 text-xl text-gray-600">Válogass szakértő edzőink között és kezdd el utad a célod felé</p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Keresés név, szakterület vagy helyszín alapján..."
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(true)}
            className="inline-flex items-center px-6 py-3 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Filter className="mr-2 h-5 w-5" />
            Szűrők
          </button>
        </div>

        <CoachFilters
          open={showFilters}
          onOpenChange={setShowFilters}
          filters={filters}
          onFiltersChange={setFilters}
          options={filterOptions}
        />

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredCoaches.map((coach) => (
            <CoachCard
              key={coach.id}
              coach={coach}
              onSelect={() => setSelectedCoach(coach)}
            />
          ))}
        </div>

        {filteredCoaches.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              Nincs a keresési feltételeknek megfelelő edző.
            </p>
          </div>
        )}

        <CoachDetails
          coach={selectedCoach}
          onClose={() => setSelectedCoach(null)}
        />
      </div>
    </div>
  );
};

export default Coaches;
