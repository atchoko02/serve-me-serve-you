// Business Login/Signup Page
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../shared/ThemeToggle';

export function LoginPage() {
  const { businessLogin, businessSignup, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isLoginMode) {
      // Login
      if (!email || !password) {
        setError('Please enter both email and password');
        return;
      }

      setIsSubmitting(true);
      try {
        await businessLogin(email, password);
        toast.success('Logged in successfully!');
        navigate('/business');
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to log in';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Signup
      if (!email || !password) {
        setError('Please enter both email and password');
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      setIsSubmitting(true);
      try {
        await businessSignup(email, password);
        toast.success('Account created successfully!');
        navigate('/business');
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to create account';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
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
            {isLoginMode ? 'Business Login' : 'Create Business Account'}
          </CardTitle>
          <CardDescription className="text-center text-slate-600 dark:text-slate-400 text-base">
            {isLoginMode 
              ? 'Sign in to manage your questionnaires and analytics'
              : 'Create an account to get started'}
          </CardDescription>
          <div className="flex items-center justify-center gap-4 text-sm mt-4">
            <button
              type="button"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-medium"
              onClick={() => navigate('/')}
            >
              Back to landing
            </button>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <button
              type="button"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-medium"
              onClick={() => navigate('/customer/login')}
            >
              Customer login
            </button>
          </div>
        </CardHeader>
        <CardContent>
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
                placeholder="business@example.com"
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
                {isLoginMode 
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Log in'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
