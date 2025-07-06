import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { PlayerGameState } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userData: PlayerGameState | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshData: () => Promise<void>;
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
  const [userData, setUserData] = useState<PlayerGameState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string): Promise<PlayerGameState | null> => {
    try {
      console.log('Fetching player state for:', userId);
      
      const { data, error } = await supabase
        .from('player_states')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Erreur lors de la récupération des données du joueur:', error);
        return null;
      }

      console.log('Données du joueur récupérées:', data);
      return data as PlayerGameState;

    } catch (error) {
      console.error('Erreur inattendue lors de la récupération des données:', error);
      return null;
    }
  };

  const refreshData = async () => {
    if (!user) return;
    
    console.log('Refreshing data for user:', user.id);
    const newUserData = await fetchUserData(user.id);
    setUserData(newUserData);
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erreur session:', error);
          if (mounted) setLoading(false);
          return;
        }

        if (session?.user && mounted) {
          console.log('Session trouvée pour:', session.user.id);
          setUser(session.user);
          setSession(session);
          
          const newUserData = await fetchUserData(session.user.id);
          if (mounted) setUserData(newUserData);
        }
      } catch (error) {
        console.error('Erreur initialisation auth:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session?.user?.id);
        
        if (!mounted) return;

        setLoading(true);
        setUser(session?.user ?? null);
        setSession(session);

        if (session?.user) {
          const newUserData = await fetchUserData(session.user.id);
          if (mounted) setUserData(newUserData);
        } else {
          if (mounted) setUserData(null);
        }
        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    userData,
    loading,
    signOut,
    refreshData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};