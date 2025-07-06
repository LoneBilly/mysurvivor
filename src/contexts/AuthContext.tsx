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
  const [isNewUser, setIsNewUser] = useState(false);

  const fetchProfileForUser = useCallback(async (userToFetch: User) => {
    const { data, error } = await supabase
      .from('player_states')
      .select('*')
      .eq('id', userToFetch.id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching profile:", error);
      setProfile(null);
    } else {
      setProfile(data || null);
    }
  }, []);

  useEffect(() => {
    setLoading(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        const currentUser = newSession?.user ?? null;
        setSession(newSession);
        setUser(currentUser);

        if (currentUser) {
          // This block handles both initial load with a session and subsequent sign-ins.
          await fetchProfileForUser(currentUser);

          if (event === 'SIGNED_IN') {
            const createdAt = new Date(currentUser.created_at).getTime();
            const lastSignInAt = currentUser.last_sign_in_at ? new Date(currentUser.last_sign_in_at).getTime() : createdAt;
            
            // If last sign-in is very close to creation time, it's likely a new user signup.
            const isSignup = (lastSignInAt - createdAt) < 5000;
            setIsNewUser(isSignup);
            if (isSignup) {
              sessionStorage.setItem('isNewUser', 'true');
            } else {
              sessionStorage.removeItem('isNewUser');
            }
          }
        } else {
          // This block handles initial load without a session and sign-outs.
          setProfile(null);
          setIsNewUser(false);
          sessionStorage.removeItem('isNewUser');
        }
        
        // The loading state is set to false only after the auth state has been fully processed.
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfileForUser]);

  const reloadProfile = useCallback(async () => {
    if (user) {
      await fetchProfileForUser(user);
    }
  }, [user, fetchProfileForUser]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    profile,
    loading,
    isNewUser: isNewUser || sessionStorage.getItem('isNewUser') === 'true',
    signOut,
    reloadProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};