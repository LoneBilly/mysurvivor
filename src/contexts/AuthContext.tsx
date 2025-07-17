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

  const navigateRef = useRef(navigate);
  const locationRef = useRef(location);
  useEffect(() => {
    navigateRef.current = navigate;
    locationRef.current = location;
  });

  const lastCheckedUserId = useRef<string | null>(null);
  const profileCheckInProgress = useRef(false);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setBannedInfo({ isBanned: false, reason: null });
    lastCheckedUserId.current = null;
    profileCheckInProgress.current = false;
    navigateRef.current('/');
  }, []);

  useEffect(() => {
    const handleAuthChange = async (_event: string, session: Session | null) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setLoading(false);
        setRole(null);
        setBannedInfo({ isBanned: false, reason: null });
        lastCheckedUserId.current = null;
        profileCheckInProgress.current = false;
        return;
      }

      const userId = currentUser.id;

      if (lastCheckedUserId.current === userId || profileCheckInProgress.current) {
        return;
      }

      profileCheckInProgress.current = true;
      setLoading(true);

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('username, role, is_banned, ban_reason')
          .eq('id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        lastCheckedUserId.current = userId;

        if (profile) {
          if (profile.is_banned) {
            setBannedInfo({ isBanned: true, reason: profile.ban_reason });
          } else {
            setBannedInfo({ isBanned: false, reason: null });
            setRole(profile.role);
            if (profile.username === null && locationRef.current.pathname !== '/create-profile') {
              navigateRef.current('/create-profile');
            } else if (profile.username !== null && (locationRef.current.pathname === '/create-profile' || locationRef.current.pathname === '/login')) {
              navigateRef.current('/game');
            }
          }
        }
      } catch (err) {
        console.error("Error checking user profile:", err);
        lastCheckedUserId.current = null;
      } finally {
        profileCheckInProgress.current = false;
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange('INITIAL_SESSION', session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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