import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { GameState } from '@/types/game';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: GameState | null;
  loading: boolean;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching profile:", error);
    }
    setProfile(data as GameState | null);
  }, []);

  const reloadProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchProfile(currentUser.id);
      }
      setLoading(false);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (event === 'SIGNED_IN' && currentUser) {
          setLoading(true);
          await fetchProfile(currentUser.id);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signOut,
    reloadProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};