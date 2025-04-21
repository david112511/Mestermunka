import { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FilterOptions } from '@/types/coach';

interface CoachFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  options: {
    specializations: string[];
    languageOptions: string[];
    experienceOptions: { value: string; label: string; }[];
    certificationOptions: string[];
    educationOptions: string[];
    locationOptions: string[];
  };
}

const FilterSection = ({ 
  title, 
  children, 
  defaultOpen = false 
}: { 
  title: string; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-2 font-medium">
        {title}
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const CoachFilters = ({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  options
}: CoachFiltersProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Részletes Szűrők</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto pr-4 max-h-[calc(85vh-10rem)]">
          <FilterSection title="Óradíj Tartomány" defaultOpen>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span>{filters.priceRange[0]}€</span>
                <span>{filters.priceRange[1]}€</span>
              </div>
              <Slider
                value={filters.priceRange}
                onValueChange={(value) => onFiltersChange({...filters, priceRange: value as number[]})}
                min={0}
                max={200}
                step={5}
                className="my-4"
              />
            </div>
          </FilterSection>

          <FilterSection title="Minimum Értékelés">
            <div>
              <Slider
                value={[filters.rating]}
                onValueChange={(value) => onFiltersChange({...filters, rating: value[0]})}
                min={0}
                max={5}
                step={0.5}
                className="my-4"
              />
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>0</span>
                <span>{filters.rating} csillag</span>
              </div>
            </div>
          </FilterSection>

          <FilterSection title="Szakterületek">
            <div className="grid grid-cols-2 gap-2">
              {options.specializations.map((spec) => (
                <div key={spec} className="flex items-center space-x-2">
                  <Checkbox
                    checked={filters.specializations.includes(spec)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onFiltersChange({
                          ...filters,
                          specializations: [...filters.specializations, spec]
                        });
                      } else {
                        onFiltersChange({
                          ...filters,
                          specializations: filters.specializations.filter(s => s !== spec)
                        });
                      }
                    }}
                  />
                  <label className="text-sm text-gray-600">{spec}</label>
                </div>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Aktív Ügyfelek">
            <div>
              <Slider
                value={[filters.minActiveClients]}
                onValueChange={(value) => onFiltersChange({...filters, minActiveClients: value[0]})}
                min={0}
                max={50}
                step={5}
                className="my-4"
              />
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>0</span>
                <span>Minimum {filters.minActiveClients} aktív ügyfél</span>
              </div>
            </div>
          </FilterSection>

          <FilterSection title="Tapasztalat">
            <input
              type="number"
              value={filters.experience}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 99)) {
                  onFiltersChange({...filters, experience: value});
                }
              }}
              placeholder="Add meg az évek számát"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              min="0"
              max="99"
            />
          </FilterSection>

          <FilterSection title="Tanúsítványok">
            <div className="space-y-2">
              {options.certificationOptions.map((cert) => (
                <div key={cert} className="flex items-center space-x-2">
                  <Checkbox
                    checked={filters.certifications.includes(cert)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onFiltersChange({
                          ...filters,
                          certifications: [...filters.certifications, cert]
                        });
                      } else {
                        onFiltersChange({
                          ...filters,
                          certifications: filters.certifications.filter(c => c !== cert)
                        });
                      }
                    }}
                  />
                  <label className="text-sm text-gray-600">{cert}</label>
                </div>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Végzettség">
            <div className="space-y-2">
              {options.educationOptions.map((edu) => (
                <div key={edu} className="flex items-center space-x-2">
                  <Checkbox
                    checked={filters.education.includes(edu)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onFiltersChange({
                          ...filters,
                          education: [...filters.education, edu]
                        });
                      } else {
                        onFiltersChange({
                          ...filters,
                          education: filters.education.filter(e => e !== edu)
                        });
                      }
                    }}
                  />
                  <label className="text-sm text-gray-600">{edu}</label>
                </div>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Helyszín">
            <div className="space-y-2">
              {options.locationOptions.map((loc) => (
                <div key={loc} className="flex items-center space-x-2">
                  <Checkbox
                    checked={filters.location.includes(loc)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onFiltersChange({
                          ...filters,
                          location: [...filters.location, loc]
                        });
                      } else {
                        onFiltersChange({
                          ...filters,
                          location: filters.location.filter(l => l !== loc)
                        });
                      }
                    }}
                  />
                  <label className="text-sm text-gray-600">{loc}</label>
                </div>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Beszélt Nyelvek">
            <div className="space-y-2">
              {options.languageOptions.map((lang) => (
                <div key={lang} className="flex items-center space-x-2">
                  <Checkbox
                    checked={filters.languages.includes(lang)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onFiltersChange({
                          ...filters,
                          languages: [...filters.languages, lang]
                        });
                      } else {
                        onFiltersChange({
                          ...filters,
                          languages: filters.languages.filter(l => l !== lang)
                        });
                      }
                    }}
                  />
                  <label className="text-sm text-gray-600">{lang}</label>
                </div>
              ))}
            </div>
          </FilterSection>

          {/* Aktív Szűrők */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            {[...filters.specializations, ...filters.certifications, ...filters.education, ...filters.location].map((filter) => (
              <span key={filter} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary">
                {filter}
                <button
                  onClick={() => {
                    const updatedFilters = { ...filters };
                    if (filters.specializations.includes(filter)) {
                      updatedFilters.specializations = filters.specializations.filter(s => s !== filter);
                    } else if (filters.certifications.includes(filter)) {
                      updatedFilters.certifications = filters.certifications.filter(c => c !== filter);
                    } else if (filters.education.includes(filter)) {
                      updatedFilters.education = filters.education.filter(e => e !== filter);
                    } else if (filters.location.includes(filter)) {
                      updatedFilters.location = filters.location.filter(l => l !== filter);
                    }
                    onFiltersChange(updatedFilters);
                  }}
                  className="ml-2"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Gombok */}
        <div className="flex justify-between pt-4 border-t mt-4 bg-white">
          <button
            onClick={() => onFiltersChange({
              priceRange: [0, 100],
              specializations: [],
              experience: '',
              languages: [],
              rating: 0,
              minActiveClients: 0,
              certifications: [],
              education: [],
              location: []
            })}
            className="text-gray-600 hover:text-gray-900"
          >
            Szűrők törlése
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Szűrők alkalmazása
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CoachFilters;
