
import { useToast } from "@/components/ui/use-toast";
import { X } from 'lucide-react';
import { PresetOption, FormData } from './types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MultiSelectProps {
  title: string;
  options: PresetOption[];
  selectedValues: string[];
  field: keyof FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}

export const MultiSelect = ({ 
  title, 
  options, 
  selectedValues, 
  field, 
  setFormData 
}: MultiSelectProps) => {
  const { toast } = useToast();

  const handleSelect = (value: string) => {
    if (selectedValues.length >= 5 && !selectedValues.includes(value)) {
      toast({
        title: "Maximum 5 elem választható",
        description: "Kérjük, először távolítson el egy elemet, ha újat szeretne hozzáadni.",
        variant: "destructive",
      });
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: selectedValues.includes(value)
        ? selectedValues.filter(v => v !== value)
        : [...selectedValues, value]
    }));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{title}</label>
      <Select onValueChange={handleSelect}>
        <SelectTrigger>
          <SelectValue placeholder={`Válasszon ${title.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.id}
              value={option.id}
              disabled={selectedValues.length >= 5 && !selectedValues.includes(option.id)}
            >
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-wrap gap-2 mt-2">
        {selectedValues.map((value) => {
          const option = options.find(o => o.id === value);
          if (!option) return null;
          return (
            <div
              key={value}
              className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-sm"
            >
              {option.name}
              <button
                type="button"
                onClick={() => handleSelect(value)}
                className="hover:text-primary/80"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
