import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, PlayerGameState } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  gameState: PlayerGameState | null;
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [gameState, setGameState] = useState<PlayerGameState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Récupérer le profil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Erreur profil:', profileError);
        return { profile: null, gameState: null };
      }

      // Récupérer l'état du jeu
      const { data: gameData, error: gameError } = await supabase
        .from('player_states')
        .select('*')
        .eq('id', userId)
        .single();

      if (gameError) {
        console.error('Erreur état du jeu:', gameError);
        return { profile: profileData, gameState: null };
      }

      return { profile: profileData, gameState: gameData };
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      return { profile: null, gameState: null };
    }
  };

  const refreshData = async () => {
    if (!user) return;
    
    const { profile: newProfile, gameState: newGameState } = await fetchUserData(user.id);
    setProfile(newProfile);
    setGameState(newGameState);
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Récupérer la session actuelle
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erreur session:', error);
          if (mounted) {
            setUser(null);
            setSession(null);
            setProfile(null);
            setGameState(null);
            setLoading(false);
          }
          return;
        }

        if (session?.user && mounted) {
          setUser(session.user);
          setSession(session);
          
          // Récupérer les données utilisateur
          const { profile, gameState } = await fetchUserData(session.user.id);
          if (mounted) {
            setProfile(profile);
            setGameState(gameState);
          }
        } else if (mounted) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setGameState(null);
        }
      } catch (error) {
        console.error('Erreur initialisation auth:', error);
        if (mounted) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setGameState(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setProfile(null);
          setGameState(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          setSession(session);
          
          if (event === 'SIGNED_IN') {
            setLoading(true);
            const { profile, gameState } = await fetchUserData(session.user.id);
            if (mounted) {
              setProfile(profile);
              setGameState(gameState);
              setLoading(false);
            }
          }
        } else {
          setUser(null);
          setSession(null);
          setProfile(null);
          setGameState(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erreur déconnexion:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    profile,
    gameState,
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