import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGameState } from '@/contexts/GameStateContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Gavel } from 'lucide-react';

type Auction = {
  id: number;
  item_name: string;
  item_icon: string;
  item_quantity: number;
  ends_at: string;
  highest_bid: number;
};

type WonAuction = {
  id: number;
  item_name: string;
  item_icon: string;
  item_quantity: number;
  amount: number;
};

const AuctionHouse = () => {
  const { user } = useAuth();
  const { openInventory } = useGameState();
  const [activeAuctions, setActiveAuctions] = useState<Auction[]>([]);
  const [wonAuctions, setWonAuctions] = useState<WonAuction[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;

    // Process expired auctions before fetching data
    await supabase.rpc('process_expired_auctions');

    // Fetch active auctions
    const { data: activeData, error: activeError } = await supabase.rpc('get_active_auctions_with_bids');
    if (activeError) toast.error("Erreur (enchères actives)");
    else setActiveAuctions(activeData || []);

    // Fetch won auctions
    const { data: wonData, error: wonError } = await supabase.rpc('get_won_auctions', { p_player_id: user.id });
    if (wonError) toast.error("Erreur (gains)");
    else setWonAuctions(wonData || []);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClaim = async (auctionId: number) => {
    const { error } = await supabase.rpc('claim_won_auction', { p_auction_id: auctionId });
    if (error) {
      if (error.message.includes('inventaire est plein')) {
        toast.error("Votre inventaire est plein !", {
          description: "Faites de la place avant de réclamer votre gain.",
          action: {
            label: "Ouvrir l'inventaire",
            onClick: () => openInventory(),
          },
        });
      } else {
        toast.error(`Erreur: ${error.message}`);
      }
    } else {
      toast.success("Objet réclamé avec succès !");
      fetchData(); // Refresh list
    }
  };

  return (
    <div className="p-4 space-y-6">
      {wonAuctions.length > 0 && (
        <Card className="bg-green-900/30 border-green-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-300"><Award /> Mes Gains</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {wonAuctions.map(auction => (
              <div key={auction.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <img src={`/icons/${auction.item_icon}`} alt={auction.item_name} className="w-10 h-10" />
                  <div>
                    <p className="font-bold">{auction.item_name} x{auction.item_quantity}</p>
                    <p className="text-sm text-gray-400">Remporté pour {auction.amount} crédits</p>
                  </div>
                </div>
                <Button onClick={() => handleClaim(auction.id)}>Réclamer</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Gavel /> Maison des Ventes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeAuctions.map(auction => (
            <div key={auction.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
              <div className="flex items-center gap-3">
                <img src={`/icons/${auction.item_icon}`} alt={auction.item_name} className="w-10 h-10" />
                <div>
                  <p className="font-bold">{auction.item_name} x{auction.item_quantity}</p>
                  <p className="text-sm text-gray-400">Offre actuelle: {auction.highest_bid || 0} crédits</p>
                </div>
              </div>
              <Button variant="secondary">Enchérir</Button>
            </div>
          ))}
          {activeAuctions.length === 0 && <p className="text-center text-gray-500">Aucune enchère active pour le moment.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

// Helper RPC functions needed for this component
/*
CREATE OR REPLACE FUNCTION get_active_auctions_with_bids()
RETURNS TABLE(id bigint, item_name text, item_icon text, item_quantity int, ends_at timestamptz, highest_bid int) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    i.name,
    i.icon,
    a.item_quantity,
    a.ends_at,
    (SELECT MAX(b.amount) FROM auction_bids b WHERE b.auction_id = a.id) as highest_bid
  FROM auctions a
  JOIN items i ON a.item_id = i.id
  WHERE a.status = 'active'
  ORDER BY a.ends_at ASC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_won_auctions(p_player_id uuid)
RETURNS TABLE(id bigint, item_name text, item_icon text, item_quantity int, amount int) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    i.name,
    i.icon,
    a.item_quantity,
    b.amount
  FROM auctions a
  JOIN items i ON a.item_id = i.id
  JOIN auction_bids b ON a.winning_bid_id = b.id
  WHERE a.status = 'awarded' AND b.player_id = p_player_id;
END;
$$ LANGUAGE plpgsql;
*/