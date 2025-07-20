import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';

type Item = { id: number; name: string; icon: string };
type Auction = { id: number; item_id: number; status: string; ends_at: string };
type Bid = { id: number; amount: number; player_username: string };

const AuctionManager = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [bids, setBids] = useState<Record<number, Bid[]>>({});
  const [sortConfig, setSortConfig] = useState<{ key: keyof Bid; direction: 'asc' | 'desc' }>({ key: 'amount', direction: 'desc' });

  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase.rpc('get_auction_items');
      if (error) toast.error("Erreur lors de la récupération des objets d'enchères.");
      else setItems(data || []);
    };
    fetchItems();
  }, []);

  useEffect(() => {
    if (!selectedItem) return;
    const fetchAuctionsAndBids = async () => {
      const { data: auctionData, error: auctionError } = await supabase
        .from('auctions')
        .select('*')
        .eq('item_id', selectedItem.id)
        .order('ends_at', { ascending: false });

      if (auctionError) {
        toast.error("Erreur lors de la récupération des enchères.");
        return;
      }
      setAuctions(auctionData || []);

      const auctionIds = auctionData.map(a => a.id);
      if (auctionIds.length > 0) {
        const { data: bidData, error: bidError } = await supabase.rpc('get_bids_for_auctions', { p_auction_ids: auctionIds });
        if (bidError) {
          toast.error("Erreur lors de la récupération des offres.");
        } else {
          const bidsByAuction = (bidData || []).reduce((acc, bid) => {
            (acc[bid.auction_id] = acc[bid.auction_id] || []).push(bid);
            return acc;
          }, {});
          setBids(bidsByAuction);
        }
      } else {
        setBids({});
      }
    };
    fetchAuctionsAndBids();
  }, [selectedItem]);

  const sortedBids = useMemo(() => {
    const sortableBids = { ...bids };
    Object.keys(sortableBids).forEach(auctionId => {
      sortableBids[Number(auctionId)].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    });
    return sortableBids;
  }, [bids, sortConfig]);

  const requestSort = (key: keyof Bid) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
      <div className="md:col-span-1 h-full flex flex-col bg-gray-800/50 border border-gray-700 rounded-lg min-h-0">
        <div className="p-4 border-b border-gray-700"><h3 className="text-lg font-bold">Objets aux enchères</h3></div>
        <div className="flex-grow overflow-y-auto no-scrollbar">
          {items.map(item => (
            <div key={item.id} onClick={() => setSelectedItem(item)} className={`p-3 border-b border-gray-700 cursor-pointer flex items-center gap-3 hover:bg-gray-800/50 ${selectedItem?.id === item.id ? 'bg-slate-700' : ''}`}>
              <img src={`/icons/${item.icon}`} alt={item.name} className="w-8 h-8" />
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="md:col-span-2 h-full flex flex-col bg-gray-800/50 border border-gray-700 rounded-lg min-h-0">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold">Historique pour: {selectedItem ? selectedItem.name : '...'}</h3>
        </div>
        <div className="flex-grow overflow-y-auto no-scrollbar p-4 space-y-4">
          {auctions.length > 0 ? auctions.map(auction => (
            <div key={auction.id} className="bg-gray-900/50 p-4 rounded-lg">
              <h4 className="font-bold">Enchère ID: {auction.id} - Statut: {auction.status}</h4>
              <p className="text-sm text-gray-400">Terminée le: {new Date(auction.ends_at).toLocaleString('fr-FR')}</p>
              <Table className="mt-2">
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button variant="ghost" onClick={() => requestSort('player_username')}>
                        Pseudo <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => requestSort('amount')}>
                        Montant <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sortedBids[auction.id] || []).map(bid => (
                    <TableRow key={bid.id}>
                      <TableCell>{bid.player_username}</TableCell>
                      <TableCell>{bid.amount} Crédits</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )) : <p className="text-center text-gray-500">Sélectionnez un objet pour voir son historique.</p>}
        </div>
      </div>
    </div>
  );
};

// Helper RPC functions needed for this component
/*
CREATE OR REPLACE FUNCTION get_auction_items()
RETURNS TABLE(id int, name text, icon text) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT i.id, i.name, i.icon
  FROM items i
  JOIN auctions a ON i.id = a.item_id
  ORDER BY i.name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_bids_for_auctions(p_auction_ids bigint[])
RETURNS TABLE(auction_id bigint, id bigint, amount int, player_username text) AS $$
BEGIN
  RETURN QUERY
  SELECT b.auction_id, b.id, b.amount, p.username as player_username
  FROM auction_bids b
  JOIN profiles p ON b.player_id = p.id
  WHERE b.auction_id = ANY(p_auction_ids);
END;
$$ LANGUAGE plpgsql;
*/