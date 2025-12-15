import { Package, TrendingUp, Presentation } from 'lucide-react';

export function BusinessValue() {
  return (
    <section id="value" className="py-24 bg-white dark:bg-slate-950">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-slate-900 dark:text-slate-100 mb-6">
            Insights that drive business decisions
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            Beyond helping customers find products, Serve Me Serve You gives you structured 
            data about what your customers actually want—critical for growing businesses.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center mb-5">
              <Package className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-slate-900 dark:text-slate-100 mb-3">Inventory Planning</h3>
            <p className="text-slate-600 dark:text-slate-400 text-base">
              Understand which product features customers prioritize. Stock smarter, reduce waste, 
              and align inventory with real demand.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-5">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-slate-900 dark:text-slate-100 mb-3">Product Refinement</h3>
            <p className="text-slate-600 dark:text-slate-400 text-base">
              Identify gaps in your catalog and discover which attributes customers care about most. 
              Refine offerings with confidence.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/20 rounded-lg flex items-center justify-center mb-5">
              <Presentation className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-slate-900 dark:text-slate-100 mb-3">Investor Communication</h3>
            <p className="text-slate-600 dark:text-slate-400 text-base">
              Export structured preference data to demonstrate market understanding and customer 
              insights in pitches and reports.
            </p>
          </div>
        </div>

        <div className="mt-16 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-8 text-center">
          <p className="text-slate-700 dark:text-slate-300 text-base max-w-3xl mx-auto">
            <span className="font-semibold text-slate-900 dark:text-slate-100">Built for smaller businesses.</span> You don't need a data science 
            team or expensive ML infrastructure. Serve Me Serve You provides enterprise-level 
            insights at a scale that works for you.
          </p>
        </div>
      </div>
    </section>
  );
}

