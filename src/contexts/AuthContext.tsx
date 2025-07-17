import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: string | null;
  signOut: () => Promise<void>;
  bannedInfo: { isBanned: boolean; reason: string | null };
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
  const [bannedInfo, setBannedInfo] = useState<{ isBanned: boolean; reason: string | null }>({ isBanned: false, reason: null });
  const navigate = useNavigate();
  const location = useLocation();

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setBannedInfo({ isBanned: false, reason: null });
    navigate('/');
  }, [navigate]);

  useEffect(() => {
    const checkUserAndProfile = async (session: Session | null) => {
      setBannedInfo({ isBanned: false, reason: null });
      if (session?.user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('username, role, is_banned, ban_reason')
          .eq('id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
          setLoading(false);
          return;
        }

        if (profile) {
          if (profile.is_banned) {
            setBannedInfo({ isBanned: true, reason: profile.ban_reason });
            setLoading(false);
            return;
          }

          setRole(profile.role);
          if (profile.username === null && location.pathname !== '/create-profile') {
            navigate('/create-profile');
          } else if (profile.username !== null && (location.pathname === '/create-profile' || location.pathname === '/login')) {
            navigate('/game');
          }
        }
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
  }, [navigate]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    role,
    signOut,
    bannedInfo,
  }), [user, session, loading, role, signOut, bannedInfo]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};