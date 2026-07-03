"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

// Shape of the authenticated user stored in context
interface AuthUser {
  uid: string;
  email: string | null;
  name: string;
  role: "teacher" | "parent" | null;
  className?: string; // Only present for teachers
}

// What the context exposes to any component that calls useAuth()
interface AuthContextType {
  user: AuthUser | null; // null = not logged in or profile not found
  loading: boolean;      // true while checking auth state on page load
}

// Create the context with safe defaults (not logged in, still loading)
const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

/**
 * Wraps the entire app and listens for Firebase Auth state changes.
 * When a user logs in or out, it fetches their Firestore profile
 * and makes it available to all child components via useAuth().
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to Firebase Auth — fires immediately with current state,
    // then again whenever the user logs in or out
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {

      // No user logged in — clear state and stop loading
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // Fetch profile from our server-side API instead of client-side Firestore
        // This avoids race conditions and permission-denied errors during propagation
        const res = await fetch("/api/auth/me", {
          credentials: "include", // VERY IMPORTANT: This sends the session cookie to the server!
        });
        
        console.log("/api/auth/me response status:", res.status);
        
        if (res.ok) {
          const profile = await res.json();
          console.log("/api/auth/me profile received:", profile);
          setUser(profile);
        } else {
          const errorData = await res.json().catch(() => {});
          console.warn("AuthContext: Server-side profile fetch failed:", res.status, errorData);
          setUser(null);
        }
      } catch (err: any) {
        console.error("AuthContext Error fetching profile:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook for accessing the current user in any component.
 * Usage: const { user, loading } = useAuth();
 */
export function useAuth() {
  return useContext(AuthContext);
}
