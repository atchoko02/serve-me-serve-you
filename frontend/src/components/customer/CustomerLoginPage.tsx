import { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, LogIn, ShieldCheck, UserPlus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '../shared/ThemeToggle';

export function CustomerLoginPage() {
  const { customerLogin, customerSignup, isLoading, role } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/recommendations';

  // If the user already has a customer session, take them to their home
  useEffect(() => {
    if (!isLoading && role === 'customer') {
      navigate('/recommendations', { replace: true });
    }
  }, [role, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (!isLoginMode) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isLoginMode) {
        await customerLogin(email, password);
        toast.success('Logged in successfully!');
      } else {
        await customerSignup(email, password);
        toast.success('Account created successfully!');
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      const errorMessage = err?.message || 'Authentication failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white dark:from-slate-900 dark:to-slate-950 px-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle compact />
      </div>

      {/* Logo/Brand in top left */}
      <div className="absolute top-6 left-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
            SM
          </div>
          <span className="text-slate-900 dark:text-slate-100 font-semibold hidden sm:inline">Serve Me Serve You</span>
        </div>
      </div>

      <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800">
        <CardHeader className="space-y-3 pb-6">
          <CardTitle className="text-3xl text-center text-slate-900 dark:text-slate-100 font-bold">
            {isLoginMode ? 'Customer Login' : 'Create Customer Account'}
          </CardTitle>
          <CardDescription className="text-center text-slate-600 dark:text-slate-400 text-base">
            Access questionnaires and save your recommendations with your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-slate-900 dark:text-slate-100">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Your answers stay linked to your account
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-base">We'll use your account to keep your questionnaires and recommendations organized.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3 text-red-700 dark:text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-900 dark:text-slate-100 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                className="h-11 border-slate-300 dark:border-slate-700 focus:border-blue-600 focus:ring-blue-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-900 dark:text-slate-100 font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                minLength={6}
                className="h-11 border-slate-300 dark:border-slate-700 focus:border-blue-600 focus:ring-blue-600"
              />
            </div>

            {!isLoginMode && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-900 dark:text-slate-100 font-medium">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  minLength={6}
                  className="h-11 border-slate-300 dark:border-slate-700 focus:border-blue-600 focus:ring-blue-600"
                />
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg mt-6" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {isLoginMode ? 'Logging in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  {isLoginMode ? (
                    <>
                      <LogIn className="w-5 h-5 mr-2" />
                      Log In
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5 mr-2" />
                      Sign Up
                    </>
                  )}
                </>
              )}
            </Button>
          </form>

          <div className="text-center text-sm pt-4">
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setError(null);
                setPassword('');
                setConfirmPassword('');
              }}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              {isLoginMode ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
            </button>
          </div>

          <div className="text-center text-sm text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-6">
            <p className="mb-2">
              Looking to manage questionnaires?
              <Link to="/business/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 ml-1 font-medium">
                Sign in as a business
              </Link>
            </p>
            <button
              type="button"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              onClick={() => navigate('/')}
            >
              Back to landing
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
