// Unified Auth Context - Single source of truth for authentication and role
// This context manages both business and customer authentication states
// and provides role-based access control

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../config/firebase';

function maskFirebaseAuthError(error: unknown, fallback: string): Error {
  const code = (error as any)?.code as string | undefined;
  const normalizedCode = code?.toLowerCase?.() || '';

  const codeMessages: Record<string, string> = {
    'auth/invalid-credential': 'Invalid email or password. Please try again.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account found with those credentials.',
    'auth/wrong-password': 'Invalid email or password. Please try again.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network issue. Check your connection and try again.',
    'auth/email-already-in-use': 'An account with this email already exists. Please log in instead.',
  };

  if (codeMessages[normalizedCode]) {
    return new Error(codeMessages[normalizedCode]);
  }

  const rawMessage = (error as any)?.message as string | undefined;
  if (rawMessage) {
    const censored = rawMessage.replace(/firebase/gi, '').trim();
    return new Error(censored || fallback);
  }

  return new Error(fallback);
}

export type UserRole = 'business' | 'customer' | null;

interface AuthContextType {
  // Auth state
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Role management
  role: UserRole;
  setRole: (role: UserRole) => void;
  
  // Business auth
  businessId: string | null;
  businessLogin: (email: string, password: string) => Promise<void>;
  businessSignup: (email: string, password: string) => Promise<void>;
  
  // Customer auth (anonymous)
  customerId: string | null;
  customerLogin: (email: string, password: string) => Promise<void>;
  customerSignup: (email: string, password: string) => Promise<void>;
  
  // Common auth
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_MAP_KEY = 'userRoleByUid';

const getRoleMap = (): Record<string, UserRole> => {
  try {
    const raw = localStorage.getItem(ROLE_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const persistRoleForUid = (uid: string, role: UserRole) => {
  if (!role) return;
  const map = getRoleMap();
  map[uid] = role;
  localStorage.setItem(ROLE_MAP_KEY, JSON.stringify(map));
};

const getStoredRoleForUid = (uid: string): UserRole => {
  const map = getRoleMap();
  return map[uid] || null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRoleState] = useState<UserRole>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Determine role from localStorage or user metadata
  // Role is stored in localStorage to persist across page refreshes
  useEffect(() => {
    const storedRole = localStorage.getItem('userRole') as UserRole;
    if (storedRole === 'business' || storedRole === 'customer') {
      setRoleState(storedRole);
    }
  }, []);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      // If user logs out, clear role
      if (!firebaseUser) {
        setRoleState(null);
        localStorage.removeItem('userRole');
        setIsLoading(false);
        return;
      }
      
      // If user exists but no role set, rely on stored role
      if (!role) {
        const mapRole = getStoredRoleForUid(firebaseUser.uid);
        const storedRole = (localStorage.getItem('userRole') as UserRole) || mapRole;
        if (storedRole === 'business' || storedRole === 'customer') {
          setRoleState(storedRole);
          localStorage.setItem('userRole', storedRole);
          persistRoleForUid(firebaseUser.uid, storedRole);
        } else if (mapRole) {
          setRoleState(mapRole);
          localStorage.setItem('userRole', mapRole);
          persistRoleForUid(firebaseUser.uid, mapRole);
        } else {
          // Role unknown; keep null to avoid misclassification and force explicit role selection
          setRoleState(null);
          localStorage.removeItem('userRole');
        }
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [role]);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    if (newRole) {
      localStorage.setItem('userRole', newRole);
      if (user?.uid) {
        persistRoleForUid(user.uid, newRole);
      }
    } else {
      localStorage.removeItem('userRole');
    }
  };

  const businessLogin = async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const existingRole = getStoredRoleForUid(cred.user.uid);
      if (existingRole && existingRole !== 'business') {
        await signOut(auth);
        throw new Error('This account is registered as a customer. Please log in as a customer.');
      }
      setRole('business');
      persistRoleForUid(cred.user.uid, 'business');
      localStorage.setItem('userRole', 'business');
      // User state will be updated via onAuthStateChanged
    } catch (error) {
      throw maskFirebaseAuthError(error, 'Unable to log in. Please try again.');
    }
  };

  const businessSignup = async (email: string, password: string) => {
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length > 0) {
        throw new Error('An account with this email already exists. Please log in instead.');
      }
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      setRole('business');
      persistRoleForUid(cred.user.uid, 'business');
      localStorage.setItem('userRole', 'business');
    } catch (error) {
      throw maskFirebaseAuthError(error, 'Unable to create account. Please try again.');
    }
  };

  const customerLogin = async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const existingRole = getStoredRoleForUid(cred.user.uid);
      if (existingRole && existingRole !== 'customer') {
        await signOut(auth);
        throw new Error('This account is registered as a business. Please log in as a business.');
      }
      setRole('customer');
      persistRoleForUid(cred.user.uid, 'customer');
      localStorage.setItem('userRole', 'customer');
    } catch (error) {
      throw maskFirebaseAuthError(error, 'Unable to log in. Please try again.');
    }
  };

  const customerSignup = async (email: string, password: string) => {
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length > 0) {
        throw new Error('An account with this email already exists. Please log in instead.');
      }
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      setRole('customer');
      persistRoleForUid(cred.user.uid, 'customer');
      localStorage.setItem('userRole', 'customer');
    } catch (error) {
      throw maskFirebaseAuthError(error, 'Unable to create account. Please try again.');
    }
  };

  const logout = async () => {
    try {
      // Set logging out flag to prevent auto-reinitialization
      setIsLoggingOut(true);
      
      // Clear role and localStorage first
      setRole(null);
      localStorage.removeItem('userRole');
      localStorage.removeItem('customerId');
      
      // Sign out from Firebase (only if there's an actual Firebase user)
      if (auth.currentUser) {
        try {
          await signOut(auth);
        } catch (signOutError) {
          // If signOut fails (e.g., network error), still clear local state
          console.warn('Firebase signOut failed, clearing local state anyway:', signOutError);
        }
      }
      
      // Clear user state immediately (don't wait for onAuthStateChanged)
      setUser(null);
      setIsLoading(false);
      
      // Reset logging out flag after a short delay to allow navigation
      // This prevents immediate re-initialization
      setTimeout(() => {
        setIsLoggingOut(false);
      }, 1000);
      
      // User state will also be updated via onAuthStateChanged, but we've cleared it immediately
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if signOut fails, clear local state
      setUser(null);
      setRole(null);
      localStorage.removeItem('userRole');
      localStorage.removeItem('customerId');
      setIsLoading(false);
      setIsLoggingOut(false);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw maskFirebaseAuthError(error, 'Unable to send reset email. Please try again.');
    }
  };

  const isAuthenticated = user !== null;
  const businessId = role === 'business' && user ? user.uid : null;
  const customerId = role === 'customer' && user ? user.uid : null;

  return (
    <AuthContext.Provider 
      value={{ 
        user,
        isLoading,
        isAuthenticated,
        role,
        setRole,
        businessId,
        businessLogin,
        businessSignup,
        customerId,
        customerLogin,
        customerSignup,
        logout,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

