import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserData {
  id: string;
  username: string | null;
  jours_survecus: number;
  vie: number;
  faim: number;
  soif: number;
  energie: number;
  position_x: number;
  position_y: number;
  base_position_x: number | null;
  base_position_y: number | null;
  grille_decouverte: number[];
  wood: number;
  metal: number;
  components: number;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userData: UserData | null;
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
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string): Promise<UserData | null> => {
    try {
      console.log('Fetching user data for:', userId);
      
      // Utilisation d'une jointure gauche (plus souple)
      const { data, error } = await supabase
        .from('player_states')
        .select(`
          *,
          profiles(username)
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Erreur lors de la récupération des données:', error);
        return null;
      }

      if (!data) {
        console.error('Aucune donnée trouvée pour l\'utilisateur:', userId);
        return null;
      }

      console.log('Données récupérées:', data);

      // La structure de 'data' est maintenant { ...player_states, profiles: { username: '...' } | null }
      const profileData = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

      const userData: UserData = {
        id: data.id,
        username: profileData?.username || null,
        jours_survecus: data.jours_survecus,
        vie: data.vie,
        faim: data.faim,
        soif: data.soif,
        energie: data.energie,
        position_x: data.position_x,
        position_y: data.position_y,
        base_position_x: data.base_position_x,
        base_position_y: data.base_position_y,
        grille_decouverte: Array.isArray(data.grille_decouverte) ? data.grille_decouverte : [],
        wood: data.wood,
        metal: data.metal,
        components: data.components,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      return userData;
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
          if (mounted) {
            setUser(null);
            setSession(null);
            setUserData(null);
            setLoading(false);
          }
          return;
        }

        if (session?.user && mounted) {
          console.log('Session trouvée pour:', session.user.id);
          setUser(session.user);
          setSession(session);
          
          const newUserData = await fetchUserData(session.user.id);
          if (mounted) {
            setUserData(newUserData);
          }
        } else if (mounted) {
          console.log('Aucune session trouvée');
          setUser(null);
          setSession(null);
          setUserData(null);
        }
      } catch (error) {
        console.error('Erreur initialisation auth:', error);
        if (mounted) {
          setUser(null);
          setSession(null);
          setUserData(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session?.user?.id);
        
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setUserData(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          setSession(session);
          
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            setLoading(true);
            const newUserData = await fetchUserData(session.user.id);
            if (mounted) {
              setUserData(newUserData);
              setLoading(false);
            }
          }
        } else {
          setUser(null);
          setSession(null);
          setUserData(null);
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