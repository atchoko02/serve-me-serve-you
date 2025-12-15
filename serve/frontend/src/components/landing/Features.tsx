import { Upload, Workflow, Target, BarChart3, Download } from 'lucide-react';

export function Features() {
  const features = [
    {
      icon: Upload,
      title: 'CSV Upload',
      description: 'Upload your product catalog via CSV and let the system analyze attributes automatically.',
    },
    {
      icon: Workflow,
      title: 'Auto-Generated Questionnaires',
      description: 'Decision-tree logic creates intelligent questions based on product differences and attributes.',
    },
    {
      icon: Target,
      title: 'Personalized Recommendations',
      description: 'Customers receive tailored product suggestions based on their responses—no guesswork.',
    },
    {
      icon: BarChart3,
      title: 'Preference Insights',
      description: 'Aggregate customer responses to understand what features and attributes matter most.',
    },
    {
      icon: Download,
      title: 'Exportable Data',
      description: 'Download structured preference data for inventory planning, product development, or investor updates.',
    },
  ];

  return (
    <section id="features" className="py-24 bg-white dark:bg-slate-950">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-slate-900 dark:text-slate-100 mb-6">
            Everything you need to guide customer decisions
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Powerful, automated tools designed for businesses without large-scale ML infrastructure.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-slate-900 dark:text-slate-100 mb-3">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-base">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

