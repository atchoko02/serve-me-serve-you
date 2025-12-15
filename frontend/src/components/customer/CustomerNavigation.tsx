// Customer Navigation - Minimal navigation for customer mode
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, Home, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { ThemeToggle } from '../shared/ThemeToggle';

export function CustomerNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, role } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  return (
    <nav className="bg-card/90 backdrop-blur border-b border-border/80 shadow-[0_1px_0_rgba(0,0,0,0.08)] transition-colors">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/recommendations" className="flex items-center gap-2 hover:opacity-90 transition-all">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-indigo-500 rounded-xl flex items-center justify-center shadow-[0_8px_24px_rgba(79,70,229,0.35)]">
              <span className="text-white text-sm font-semibold">SMSY</span>
            </div>
            <span className="text-foreground font-semibold">Serve Me Serve You</span>
          </Link>

          {/* Navigation Items */}
          <div className="flex items-center gap-1.5">
            <Link
              to="/recommendations"
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                location.pathname.startsWith('/recommendations')
                  ? 'bg-primary/10 text-primary shadow-[0_10px_30px_rgba(79,70,229,0.12)]'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">My Recommendations</span>
            </Link>
            <Link
              to="/recommendations"
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <ThemeToggle compact />
            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-gray-600 hover:bg-accent hover:text-foreground transition-all duration-200 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}

