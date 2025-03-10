
import { useState, useMemo } from 'react';
import { Coach, FilterOptions } from '@/types/coach';

export const useCoachFilters = (coaches: Coach[], initialFilters: FilterOptions) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);

  const filteredCoaches = useMemo(() => {
    // Safety check - ensure coaches array exists
    if (!coaches || !Array.isArray(coaches) || coaches.length === 0) {
      return [];
    }
    
    return coaches.filter(coach => {
      // Skip null coaches
      if (!coach) return false;
      
      // Search term filtering
      if (searchTerm && searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = coach.name.toLowerCase().includes(searchLower);
        const specialtyMatch = coach.specialty.toLowerCase().includes(searchLower);
        const locationMatch = coach.location.toLowerCase().includes(searchLower);
        
        if (!nameMatch && !specialtyMatch && !locationMatch) return false;
      }

      // Price range filtering
      if (filters.priceRange[0] > 0 || filters.priceRange[1] < 100) {
        const price = parseInt(coach.price || '0');
        if (!isNaN(price) && (price < filters.priceRange[0] || price > filters.priceRange[1])) return false;
      }
      
      // Specialization filtering
      if (filters.specializations.length > 0) {
        const hasSpecialization = filters.specializations.some(spec => 
          coach.specializationAreas.some(area => area.toLowerCase().includes(spec.toLowerCase()))
        );
        if (!hasSpecialization) return false;
      }
      
      // Experience filtering
      if (filters.experience) {
        const coachExp = parseInt(coach.experience || '0');
        if (isNaN(coachExp)) return false;
        
        switch (filters.experience) {
          case '0-2': 
            if (coachExp > 2) return false;
            break;
          case '3-5':
            if (coachExp < 3 || coachExp > 5) return false;
            break;
          case '5-10':
            if (coachExp < 5 || coachExp > 10) return false;
            break;
          case '10+':
            if (coachExp < 10) return false;
            break;
        }
      }
      
      // Languages filtering
      if (filters.languages.length > 0) {
        const hasLanguage = filters.languages.some(lang => 
          coach.languages.some(l => l.toLowerCase().includes(lang.toLowerCase()))
        );
        if (!hasLanguage) return false;
      }
      
      // Certifications filtering
      if (filters.certifications.length > 0) {
        const hasCertification = filters.certifications.some(cert => 
          coach.certifications.some(c => c.toLowerCase().includes(cert.toLowerCase()))
        );
        if (!hasCertification) return false;
      }
      
      // Education filtering
      if (filters.education.length > 0) {
        const hasEducation = filters.education.some(edu => 
          coach.education.some(e => e.toLowerCase().includes(edu.toLowerCase()))
        );
        if (!hasEducation) return false;
      }
      
      // Location filtering
      if (filters.location.length > 0) {
        const hasLocation = filters.location.some(loc => 
          coach.location.toLowerCase().includes(loc.toLowerCase())
        );
        if (!hasLocation) return false;
      }
      
      // Rating filtering
      if (filters.rating > 0 && coach.rating < filters.rating) {
        return false;
      }
      
      // Active clients filtering
      if (filters.minActiveClients > 0 && coach.activeClients < filters.minActiveClients) {
        return false;
      }
      
      return true;
    });
  }, [coaches, searchTerm, filters]);

  const resetFilters = () => {
    setFilters({
      priceRange: [0, 200],
      specializations: [],
      experience: '',
      languages: [],
      rating: 0,
      minActiveClients: 0,
      certifications: [],
      education: [],
      location: []
    });
    setSearchTerm('');
  };

  return {
    searchTerm, 
    setSearchTerm,
    filters,
    setFilters,
    filteredCoaches,
    resetFilters
  };
};
