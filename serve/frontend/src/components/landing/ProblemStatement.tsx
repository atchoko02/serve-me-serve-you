import { AlertCircle, Filter, FileQuestion } from 'lucide-react';

export function ProblemStatement() {
  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-slate-900 dark:text-slate-100 mb-6">
            The problem with product discovery
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            When customers face too many similar options, decision fatigue sets in. 
            Traditional filters don't capture intent, and manual surveys are time-consuming to create and maintain.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-slate-950 p-8 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center mb-5">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-slate-900 dark:text-slate-100 mb-3">Decision Fatigue</h3>
            <p className="text-slate-600 dark:text-slate-400 text-base">
              Customers overwhelmed by large catalogs abandon searches or make suboptimal choices, 
              hurting satisfaction and sales.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-950 p-8 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-lg flex items-center justify-center mb-5">
              <Filter className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-slate-900 dark:text-slate-100 mb-3">Basic Filters Fall Short</h3>
            <p className="text-slate-600 dark:text-slate-400 text-base">
              Standard category and price filters don't capture customer intent or guide them 
              toward the best match for their needs.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-950 p-8 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center mb-5">
              <FileQuestion className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-slate-900 dark:text-slate-100 mb-3">Manual Surveys Are Tedious</h3>
            <p className="text-slate-600 dark:text-slate-400 text-base">
              Creating custom surveys for each product line is time-intensive and doesn't scale 
              as your catalog evolves.
            </p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-600 dark:text-slate-400 text-base">
            <span className="font-semibold text-slate-900 dark:text-slate-100">Serve Me Serve You</span> solves this by automatically 
            generating smart questionnaires that adapt to your product data.
          </p>
        </div>
      </div>
    </section>
  );
}

