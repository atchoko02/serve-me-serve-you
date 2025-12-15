// Business Navigation - Full navigation for business mode
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, GitBranch, BarChart3, User, FileDown, FileText, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { ThemeToggle } from './ThemeToggle';

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, role } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/', { replace: true });
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/business' },
    { label: 'Decision Trees', icon: GitBranch, path: '/business/trees' },
    { label: 'Questionnaires', icon: FileText, path: '/business/questionnaires' },
    { label: 'Analytics', icon: BarChart3, path: '/business/analytics' },
    { label: 'Export', icon: FileDown, path: '/business/export' },
    { label: 'Account', icon: User, path: '/business/account' },
  ];

  return (
    <nav className="bg-card/90 backdrop-blur border-b border-border/80 shadow-[0_1px_0_rgba(0,0,0,0.08)] transition-colors">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/business" className="flex items-center gap-2 hover:opacity-90 transition-all">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-indigo-500 rounded-xl flex items-center justify-center shadow-[0_8px_24px_rgba(79,70,229,0.35)]">
              <span className="text-white font-semibold">B</span>
            </div>
            <span className="text-foreground font-semibold">Business Dashboard</span>
          </Link>

          {/* Navigation Items */}
          <div className="flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                               (item.path === '/business' && location.pathname === '/business');
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary/10 text-primary shadow-[0_10px_30px_rgba(79,70,229,0.12)]'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
            <ThemeToggle compact />
            {user && role === 'business' ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            ) : (
              <Link
                to="/business/login"
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-gray-600 hover:bg-accent hover:text-foreground transition-all duration-200 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}