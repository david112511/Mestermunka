
import { Input } from "@/components/ui/input";
import { FormContextProps } from '../types';
import { MultiSelect } from '../MultiSelect';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Step3ContactInfo = ({ 
  formData, 
  setFormData, 
  presetOptions 
}: FormContextProps) => {
  return (
    <>
      <h3 className="text-lg font-semibold mb-4">Elérhetőség és nyelvtudás</h3>
      <div className="space-y-4">
        <Input
          placeholder="Telefonszám"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
        />
        <Select onValueChange={(value) => setFormData({ ...formData, location: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Válasszon helyszínt" />
          </SelectTrigger>
          <SelectContent>
            {presetOptions.locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <MultiSelect
          title="Beszélt nyelvek"
          options={presetOptions.languages}
          selectedValues={formData.languages}
          field="languages"
          setFormData={setFormData}
        />
      </div>
    </>
  );
};
