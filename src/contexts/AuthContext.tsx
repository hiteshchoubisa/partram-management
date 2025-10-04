"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  session: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session from cookies
    const checkAuth = () => {
      const authCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('pm_auth='));
      
      const userCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('pm_user='));

      if (authCookie && userCookie) {
        try {
          const userData = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
          setUser(userData);
          setSession({ user: userData });
        } catch (err) {
          console.error('Error parsing user data:', err);
          // Clear invalid cookies
          document.cookie = 'pm_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'pm_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    // This will be handled in the login page directly
    return { error: null };
  };

  const signOut = async () => {
    // Clear cookies
    document.cookie = 'pm_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'pm_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    setUser(null);
    setSession(null);
  };

  const isAdmin = user?.email === "hitesh.choubisa123@gmail.com";

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
