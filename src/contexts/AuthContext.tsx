import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback, useRef } from 'react';
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
  
  const lastCheckedUserId = useRef<string | null>(null);
  const isCheckingProfile = useRef(false);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setBannedInfo({ isBanned: false, reason: null });
    lastCheckedUserId.current = null;
    isCheckingProfile.current = false;
    navigate('/');
  }, [navigate]);

  const checkUserAndProfile = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      lastCheckedUserId.current = null;
      setLoading(false);
      return;
    }

    if (session.user.id === lastCheckedUserId.current) {
      setLoading(false);
      return;
    }

    if (isCheckingProfile.current) {
      return;
    }

    isCheckingProfile.current = true;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, role, is_banned, ban_reason')
        .eq('id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      lastCheckedUserId.current = session.user.id;

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
    } catch (error) {
      console.error('Error fetching profile:', error);
      lastCheckedUserId.current = null;
    } finally {
      isCheckingProfile.current = false;
      setLoading(false);
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    const initialCheck = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      await checkUserAndProfile(session);
      setLoading(false);
    };
    initialCheck();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        checkUserAndProfile(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [checkUserAndProfile]);

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