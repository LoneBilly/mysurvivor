import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { PlayerState } from '@/types/game';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: PlayerState | null;
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
  const [profile, setProfile] = useState<PlayerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const fetchProfile = useCallback(async (userId: string): Promise<PlayerState | null> => {
    try {
      const { data, error } = await supabase
        .from('player_states')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Pas de profil trouvé
          return null;
        }
        console.error("Erreur lors de la récupération du profil:", error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error("Erreur inattendue lors de la récupération du profil:", error);
      return null;
    }
  }, []);

  const initializeAuth = useCallback(async () => {
    try {
      // Récupérer la session actuelle
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Erreur lors de la récupération de la session:", error);
        setUser(null);
        setSession(null);
        setProfile(null);
        return;
      }

      if (session?.user) {
        setUser(session.user);
        setSession(session);
        
        // Récupérer le profil
        const userProfile = await fetchProfile(session.user.id);
        setProfile(userProfile);
      } else {
        setUser(null);
        setSession(null);
        setProfile(null);
      }
    } catch (error) {
      console.error("Erreur lors de l'initialisation de l'auth:", error);
      setUser(null);
      setSession(null);
      setProfile(null);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [fetchProfile]);

  useEffect(() => {
    // Initialiser l'authentification au montage
    initializeAuth();

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        try {
          if (session?.user) {
            setUser(session.user);
            setSession(session);
            
            // Récupérer le profil seulement si c'est un nouvel utilisateur ou une connexion
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              const userProfile = await fetchProfile(session.user.id);
              setProfile(userProfile);
            }
          } else {
            setUser(null);
            setSession(null);
            setProfile(null);
          }
        } catch (error) {
          console.error("Erreur dans onAuthStateChange:", error);
        } finally {
          if (initialized) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [initializeAuth, fetchProfile, initialized]);

  const reloadProfile = useCallback(async () => {
    if (!user) return;
    
    try {
      const userProfile = await fetchProfile(user.id);
      setProfile(userProfile);
    } catch (error) {
      console.error("Erreur lors du rechargement du profil:", error);
    }
  }, [user, fetchProfile]);

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Erreur lors de la déconnexion:", error);
      }
    } finally {
      setLoading(false);
    }
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