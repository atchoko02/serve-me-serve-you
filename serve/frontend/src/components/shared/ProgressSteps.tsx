import { Check } from 'lucide-react';

interface ProgressStepsProps {
  currentStep: number;
}

export function ProgressSteps({ currentStep }: ProgressStepsProps) {
  const steps = [
    { number: 1, label: 'Upload Data' },
    { number: 2, label: 'Generate Tree' },
    { number: 3, label: 'Publish Questionnaire' },
  ];

  return (
    <div className="flex items-center justify-center gap-4">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                step.number < currentStep
                  ? 'bg-blue-600 text-white'
                  : step.number === currentStep
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step.number < currentStep ? (
                <Check className="w-5 h-5" />
              ) : (
                <span>{step.number}</span>
              )}
            </div>
            <span
              className={`hidden sm:inline ${
                step.number <= currentStep ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-16 h-0.5 mx-4 ${
                step.number < currentStep ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
