
import { Textarea } from "@/components/ui/textarea";
import { FormContextProps } from '../types';

export const Step5Biography = ({ 
  formData, 
  setFormData 
}: FormContextProps) => {
  return (
    <>
      <h3 className="text-lg font-semibold mb-4">Bemutatkozás</h3>
      <div className="space-y-4">
        <Textarea
          placeholder="Rövid leírás"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
        <Textarea
          placeholder="Részletes bemutatkozás"
          value={formData.fullBio}
          onChange={(e) => setFormData({ ...formData, fullBio: e.target.value })}
          required
        />
      </div>
    </>
  );
};
