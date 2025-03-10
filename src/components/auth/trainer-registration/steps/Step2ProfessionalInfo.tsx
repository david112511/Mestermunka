
import { Input } from "@/components/ui/input";
import { FormContextProps } from '../types';
import { MultiSelect } from '../MultiSelect';

export const Step2ProfessionalInfo = ({ 
  formData, 
  setFormData, 
  presetOptions 
}: FormContextProps) => {
  return (
    <>
      <h3 className="text-lg font-semibold mb-4">Szakmai adatok</h3>
      <div className="space-y-4">
        <MultiSelect
          title="Szakterületek"
          options={presetOptions.specializations}
          selectedValues={formData.specializations}
          field="specializations"
          setFormData={setFormData}
        />
        <Input
          placeholder="Óradíj"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          required
        />
        <Input
          placeholder="Tapasztalat (években)"
          value={formData.experience}
          onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
          required
        />
      </div>
    </>
  );
};
