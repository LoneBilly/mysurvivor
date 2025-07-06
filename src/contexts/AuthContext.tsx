import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { PlayerState } from '@/types/game';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: PlayerState | null;
  loading: boolean;
  isNewUser: boolean;
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
  const [profile, setProfile] = useState<PlayerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(sessionStorage.getItem('isNewUser') === 'true');

  const fetchProfile = useCallback(async (user: User) => {
    try {
      const { data, error } = await supabase
        .from('player_states')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      setProfile(data || null);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setSession(session);
        setUser(currentUser);

        if (currentUser) {
          if (event === 'SIGNED_IN') {
            const createdAt = new Date(currentUser.created_at).getTime();
            const lastSignInAt = currentUser.last_sign_in_at ? new Date(currentUser.last_sign_in_at).getTime() : createdAt;
            if (lastSignInAt - createdAt < 5000) { // 5 second threshold for signup
              setIsNewUser(true);
              sessionStorage.setItem('isNewUser', 'true');
            } else {
              setIsNewUser(false);
              sessionStorage.removeItem('isNewUser');
            }
          }
          await fetchProfile(currentUser);
        } else {
          setProfile(null);
          setIsNewUser(false);
          sessionStorage.removeItem('isNewUser');
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const reloadProfile = useCallback(async () => {
    if (user) {
      setLoading(true);
      await fetchProfile(user);
      setLoading(false);
    }
  }, [user, fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    profile,
    loading,
    isNewUser,
    signOut,
    reloadProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};