import { Upload, Wand2, Users } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      number: '01',
      icon: Upload,
      title: 'Upload Your Product Data',
      description: 'Import your product catalog via CSV. Include product names, attributes, descriptions, and any metadata. The system handles the rest.',
    },
    {
      number: '02',
      icon: Wand2,
      title: 'System Generates Questionnaire',
      description: 'Our decision-tree algorithm analyzes product attributes and automatically creates an intuitive, guided questionnaire tailored to your catalog.',
    },
    {
      number: '03',
      icon: Users,
      title: 'Customers Get Recommendations',
      description: 'Customers answer a few simple questions and receive personalized product recommendations. You collect structured preference data automatically.',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-slate-900 dark:text-slate-100 mb-6">
            How it works
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            From product upload to customer recommendations in three simple steps.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative">
                <div className="bg-white dark:bg-slate-950 p-8 rounded-xl border border-slate-200 dark:border-slate-800 h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{step.number}</div>
                  </div>
                  
                  <h3 className="text-slate-900 dark:text-slate-100 mb-4">{step.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-base">{step.description}</p>
                </div>

                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 w-12 h-px bg-gradient-to-r from-slate-300 dark:from-slate-700 to-transparent"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

