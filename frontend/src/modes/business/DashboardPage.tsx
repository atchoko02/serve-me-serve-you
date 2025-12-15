// Business Dashboard Page - Product upload and tree building
import { CSVUpload } from '../../components/business/CSVUpload';
import { CSVBuilder } from '../../components/business/CSVBuilder';
import { ProgressSteps } from '../../components/shared/ProgressSteps';
import { useNavigate } from 'react-router-dom';

export function DashboardPage() {
  const navigate = useNavigate();

  const handleProcessData = (data: any) => {
    // Navigate to questionnaire preview (business can test it)
    navigate('/business/questionnaires/preview', { state: { questionnaireData: data } });
  };

  return (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Product Data Setup</h1>
        <p className="text-gray-600">
          Upload or build product data to generate an optimized decision tree.
        </p>
      </div>

      {/* Progress Steps */}
      <ProgressSteps currentStep={1} />

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <CSVUpload onProcessData={handleProcessData} />
        <CSVBuilder onProcessData={handleProcessData} />
      </div>
    </>
  );
}

