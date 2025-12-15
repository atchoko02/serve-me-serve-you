// Customer Context - Provides customerId from Firebase Anonymous Auth
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signInAnonymously, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

interface CustomerContextType {
  customerId: string;
  user: User | null;
  isLoading: boolean;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Automatically sign in anonymously on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if user is already signed in
        if (auth.currentUser) {
          setUser(auth.currentUser);
          setIsLoading(false);
          return;
        }

        // Wait a bit to ensure emulator connection is established (if using emulator)
        await new Promise(resolve => setTimeout(resolve, 200));

        // Sign in anonymously
        // Use a timeout to prevent hanging if emulator is not running
        const authPromise = signInAnonymously(auth);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout - emulator may not be running')), 5000)
        );

        const userCredential = await Promise.race([authPromise, timeoutPromise]) as any;
        setUser(userCredential.user);
        console.log('Customer anonymous auth successful');
      } catch (error: any) {
        console.warn('Firebase anonymous auth failed (this is OK if emulator is not running):', error?.message || error);
        // Fallback: generate a local customerId if auth fails
        // This allows the app to work even if Firebase is not available
        let customerId = localStorage.getItem('customerId');
        if (!customerId) {
          customerId = `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('customerId', customerId);
        }
        // Create a mock user object for compatibility
        setUser({ uid: customerId } as User);
        console.log('✅ Using fallback customerId (Firebase emulator not required):', customerId);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    // User state will be updated via onAuthStateChanged
  };

  // customerId is the user's uid (anonymous auth provides a unique uid)
  const customerId = user?.uid || '';

  return (
    <CustomerContext.Provider value={{ customerId, user, isLoading, logout }}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
}
