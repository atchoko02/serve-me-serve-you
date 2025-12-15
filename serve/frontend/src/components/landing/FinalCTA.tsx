import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';

export function FinalCTA() {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-slate-900 dark:bg-slate-950">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center space-y-8">
          <h2 className="text-white dark:text-slate-100">
            Start guiding customers to the right product
          </h2>
          <p className="text-slate-300 dark:text-slate-400 max-w-2xl mx-auto">
            Upload your product catalog and let our system generate intelligent questionnaires 
            that help customers decide—while you collect valuable preference insights.
          </p>
          
          <div className="flex justify-center pt-4">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 h-14 px-12 sm:px-16 shadow-lg text-base w-full sm:w-auto"
              onClick={() => navigate('/business/login')}
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          <p className="text-sm text-slate-400 dark:text-slate-500 pt-4">
            No credit card required • CSV upload ready • Get insights immediately
          </p>
        </div>
      </div>
    </section>
  );
}

