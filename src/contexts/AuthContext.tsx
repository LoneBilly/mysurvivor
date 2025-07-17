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
  const profileCheckInProgress = useRef(false);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // Reset all states on sign out
    setUser(null);
    setSession(null);
    setRole(null);
    setBannedInfo({ isBanned: false, reason: null });
    lastCheckedUserId.current = null;
    profileCheckInProgress.current = false;
    navigate('/');
  }, [navigate]);

  useEffect(() => {
    const handleAuthChange = async (_event: string, session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (!session?.user) {
        setLoading(false);
        setRole(null);
        setBannedInfo({ isBanned: false, reason: null });
        lastCheckedUserId.current = null;
        profileCheckInProgress.current = false;
        return;
      }

      const userId = session.user.id;

      // Combined check: bail if we've already checked this user OR if a check is currently running.
      if (lastCheckedUserId.current === userId || profileCheckInProgress.current) {
        return;
      }

      // Acquire lock
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

        // On success, mark this user as checked.
        lastCheckedUserId.current = userId;

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
      } catch (err) {
        console.error("Error checking user profile:", err);
        // If the check fails, we should allow it to be tried again.
        lastCheckedUserId.current = null;
      } finally {
        // Release the lock and update loading state.
        profileCheckInProgress.current = false;
        setLoading(false);
      }
    };

    // Initial check on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange('INITIAL_SESSION', session);
    });

    // Set up the listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

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