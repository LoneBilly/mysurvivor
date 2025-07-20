import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'sonner';
import { PlayerData } from '@/types';

interface GameContextType {
  playerData: PlayerData | null;
  isLoading: boolean;
  isProcessing: boolean;
  refetchPlayerData: () => Promise<void>;
  performAction: (action: () => Promise<{ error: any }>) => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
    const supabase = useSupabaseClient();
    const user = useUser();
    const [playerData, setPlayerData] = useState<PlayerData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const refetchPlayerData = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase.rpc('get_full_player_data', { p_user_id: user.id });
            if (error) throw error;
            setPlayerData(data);
        } catch (error) {
            console.error('Error refetching player data:', error);
            toast.error("Erreur lors du rafraîchissement des données.");
        }
    }, [user, supabase]);

    useEffect(() => {
        if (user) {
            setIsLoading(true);
            refetchPlayerData().finally(() => setIsLoading(false));
        } else {
            setPlayerData(null);
            setIsLoading(false);
        }
    }, [user, refetchPlayerData]);

    const performAction = useCallback(async (action: () => Promise<{ error: any }>) => {
        setIsProcessing(true);
        try {
            const { error } = await action();
            if (error) {
                toast.error(error.message || "Une erreur est survenue.");
            }
        } catch (error: any) {
            toast.error(error.message || "Une erreur inattendue est survenue.");
        } finally {
            // Always refetch to keep UI consistent
            await refetchPlayerData();
            setIsProcessing(false);
        }
    }, [refetchPlayerData]);

    const value = { playerData, isLoading, isProcessing, refetchPlayerData, performAction };

    return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
    const context = useContext(GameContext);
    if (context === undefined) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
};