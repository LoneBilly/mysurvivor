import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { showError } from '@/utils/toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: string | null;
  signOut: () => Promise<void>;
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
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    navigate('/');
  }, [navigate]);

  useEffect(() => {
    const checkUserAndProfile = async (session: Session | null) => {
      if (session?.user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('username, role, is_banned, ban_reason')
          .eq('id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
        }

        if (profile) {
          if (profile.is_banned) {
            await signOut();
            const reason = profile.ban_reason ? `Raison : ${profile.ban_reason}` : "Aucune raison spécifiée.";
            showError(`Votre compte a été banni. ${reason}`);
            return;
          }

          setRole(profile.role);
          if (profile.username === null && location.pathname !== '/create-profile') {
            navigate('/create-profile');
          } else if (profile.username !== null && (location.pathname === '/create-profile' || location.pathname === '/login')) {
            navigate('/game');
          }
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      checkUserAndProfile(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        checkUserAndProfile(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname, signOut]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    role,
    signOut,
  }), [user, session, loading, role, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};