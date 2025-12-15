import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-12">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                SM
              </div>
              <span className="text-slate-900 dark:text-slate-100 font-semibold">Serve Me Serve You</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-base max-w-sm">
              Automated product recommendation questionnaires for businesses 
              that want to guide customers and understand preferences.
            </p>
          </div>
          
          <div>
            <h4 className="text-slate-900 dark:text-slate-100 font-semibold mb-4 text-base">Product</h4>
            <ul className="space-y-3">
              <li><a href="#features" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-base">Features</a></li>
              <li><a href="#how-it-works" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-base">How It Works</a></li>
              <li><Link to="/business/login" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-base">Business Login</Link></li>
              <li><Link to="/customer/login" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-base">Customer Login</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-slate-900 dark:text-slate-100 font-semibold mb-4 text-base">Company</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-base">About</a></li>
              <li><a href="#" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-base">Contact</a></li>
              <li><a href="#" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-base">Privacy Policy</a></li>
              <li><a href="#" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-base">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
          <p className="text-slate-600 dark:text-slate-400 text-center text-sm">
            © 2025 Serve Me Serve You. CS320 Project. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

