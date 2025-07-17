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

  const checkUserAndProfile = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

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
      } else {
        setBannedInfo({ isBanned: false, reason: null });
        setRole(profile.role);
        if (profile.username === null && location.pathname !== '/create-profile') {
          navigate('/create-profile');
        } else if (profile.username !== null && (location.pathname === '/create-profile' || location.pathname === '/login')) {
          navigate('/game');
        }
      }
    }
    setLoading(false);
  }, [navigate, location.pathname]);

  useEffect(() => {
    const handleAuthChange = async (event: string, session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);

      // We only need to fetch the full profile on SIGNED_IN.
      // For other events like TOKEN_REFRESHED, the user/session object is updated,
      // but we don't need to hit the database for the profile data again.
      if (event === 'SIGNED_IN') {
        await checkUserAndProfile(session);
      } else if (event === 'SIGNED_OUT') {
        setRole(null);
        setBannedInfo({ isBanned: false, reason: null });
        navigate('/');
        setLoading(false);
      } else if (event === 'INITIAL_SESSION') {
        // This handles the initial page load
        await checkUserAndProfile(session);
      } else {
        // For TOKEN_REFRESHED or USER_UPDATED, we might not need a full profile refetch
        // unless we suspect the role or banned status could change.
        // For now, we assume the session object is sufficient.
        if (loading) setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange('INITIAL_SESSION', session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        handleAuthChange(event, session);
      }
    );

    return () => subscription.unsubscribe();
  }, [checkUserAndProfile, navigate, loading]);

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