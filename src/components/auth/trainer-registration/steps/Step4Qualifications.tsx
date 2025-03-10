
import { Input } from "@/components/ui/input";
import { FormContextProps } from '../types';
import { MultiSelect } from '../MultiSelect';

export const Step4Qualifications = ({ 
  formData, 
  setFormData, 
  presetOptions 
}: FormContextProps) => {
  return (
    <>
      <h3 className="text-lg font-semibold mb-4">Képesítések</h3>
      <div className="space-y-4">
        <MultiSelect
          title="Végzettségek"
          options={presetOptions.educations}
          selectedValues={formData.educations}
          field="educations"
          setFormData={setFormData}
        />
        <MultiSelect
          title="Tanúsítványok"
          options={presetOptions.certifications}
          selectedValues={formData.certifications}
          field="certifications"
          setFormData={setFormData}
        />
        <Input
          placeholder="Elérhetőség (pl.: H-P 9-17)"
          value={formData.availability}
          onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
          required
        />
      </div>
    </>
  );
};
