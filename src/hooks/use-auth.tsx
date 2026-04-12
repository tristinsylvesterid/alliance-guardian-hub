import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "admin" | "officer";

interface AuthState {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
  isOfficer: boolean;
  displayName: string;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const fetchRoles = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (data) {
        setRoles(data.map((r) => r.role as AppRole));
      }
    } catch {
      setRoles([]);
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", userId)
        .single();
      if (data) {
        setDisplayName(data.display_name || "");
      }
    } catch {
      setDisplayName("");
    }
  }, []);

  useEffect(() => {
    // Skip auth initialization during SSR
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // 1. Restore session from storage FIRST
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      const u = initialSession?.user ?? null;
      setSession(initialSession);
      setUser(u);
      setLoading(false);
      setInitialized(true);

      if (u) {
        void fetchRoles(u.id);
        void fetchProfile(u.id);
      }
    });

    // 2. Listen for subsequent changes (sign in/out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isMounted) return;
        const u = nextSession?.user ?? null;
        setSession(nextSession);
        setUser(u);
        // Only clear loading if getSession hasn't resolved yet
        if (!initialized) {
          setLoading(false);
          setInitialized(true);
        }

        if (u) {
          void fetchRoles(u.id);
          void fetchProfile(u.id);
        } else {
          setRoles([]);
          setDisplayName("");
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchRoles, fetchProfile, initialized]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
    setDisplayName("");
  }, []);

  const isAdmin = roles.includes("admin");
  const isOfficer = roles.includes("officer") || isAdmin;

  return (
    <AuthContext.Provider
      value={{ user, session, roles, loading, isAdmin, isOfficer, displayName, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
