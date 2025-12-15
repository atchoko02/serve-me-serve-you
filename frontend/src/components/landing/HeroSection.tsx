import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';

export function HeroSection() {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    scrollToSection(id);
  };

  return (
    <div className="relative bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-5 max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
              SM
            </div>
            <span className="text-slate-900 dark:text-slate-100 font-semibold">Serve Me Serve You</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              onClick={(e) => handleNavClick(e, 'features')}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-sm font-medium"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => handleNavClick(e, 'how-it-works')}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-sm font-medium"
            >
              How It Works
            </a>
            <a
              href="#value"
              onClick={(e) => handleNavClick(e, 'value')}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-sm font-medium"
            >
              Value
            </a>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => navigate('/business/login')}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="container mx-auto px-6 py-24 md:py-32 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 max-w-2xl">
            <div className="space-y-6">
              <h1 className="text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                Help customers find the right product, every time
              </h1>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Automatically generate intelligent questionnaires from your product catalog. 
                Guide customers through complex choices and gain structured insights into their preferences—no 
                data science team required.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 h-12 px-6 shadow-lg"
                onClick={() => navigate('/business/login')}
              >
                Upload Your Products
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="h-12 px-6 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900"
                onClick={() => scrollToSection('how-it-works')}
              >
                How It Works
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center gap-10 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">CSV Upload</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Simple integration</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Auto-Generated</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Questionnaires</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Exportable</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Preference data</div>
              </div>
            </div>
          </div>

          {/* Hero Visual - Simulated questionnaire interface */}
          <div className="relative">
            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="text-base font-semibold text-slate-900 dark:text-slate-100">Product Finder</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Step 2 of 4</div>
                </div>
                
                <div className="space-y-4">
                  <div className="text-slate-700 dark:text-slate-300 font-medium">What's your primary use case?</div>
                  
                  <div className="space-y-3">
                    {['Personal use', 'Small business', 'Enterprise'].map((option, i) => (
                      <div
                        key={i}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          i === 1
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            i === 1 ? 'border-blue-600' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {i === 1 && <div className="w-3 h-3 rounded-full bg-blue-600"></div>}
                          </div>
                          <span className="text-sm text-slate-700 dark:text-slate-300">{option}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg">
                  Continue
                </button>
              </div>
            </div>
            
            {/* Decorative badge */}
            <div className="absolute -top-4 -right-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 shadow-lg">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">3 products matched</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

