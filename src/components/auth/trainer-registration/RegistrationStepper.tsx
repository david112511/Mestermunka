
import { RegistrationStep } from './types';

interface RegistrationStepperProps {
  currentStep: RegistrationStep;
}

export const RegistrationStepper = ({ currentStep }: RegistrationStepperProps) => {
  return (
    <div className="flex justify-between mb-4">
      {[1, 2, 3, 4, 5].map((step) => (
        <div
          key={step}
          className={`h-2 w-1/6 rounded ${
            step <= currentStep ? 'bg-primary' : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
};
