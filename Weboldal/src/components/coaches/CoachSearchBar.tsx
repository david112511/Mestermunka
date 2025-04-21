
import { Search, Filter } from 'lucide-react';
import { FilterOptions } from '@/types/coach';

interface CoachSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onShowFilters: () => void;
}

const CoachSearchBar = ({ 
  searchTerm, 
  onSearchChange, 
  onShowFilters 
}: CoachSearchBarProps) => {
  return (
    <div className="mt-8 flex flex-col sm:flex-row gap-4">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Keresés név, szakterület vagy helyszín alapján..."
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <button 
        onClick={onShowFilters}
        className="inline-flex items-center px-6 py-3 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Filter className="mr-2 h-5 w-5" />
        Szűrők
      </button>
    </div>
  );
};

export default CoachSearchBar;
