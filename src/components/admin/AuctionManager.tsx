import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, PlusCircle, Gavel } from 'lucide-react';
import { Item } from '@/types/admin';
import { showError } from '@/utils/toast';
import AuctionFormModal from './AuctionFormModal';
import { getPublicIconUrl } from '@/utils/imageUrls';
import ItemIcon from '../ItemIcon';

interface Auction {
  id: number;
  created_at: string;
  ends_at: string;
  item_id: number;
  item_quantity: number;
  status: 'active' | 'completed';
  description: string | null;
  items: { name: string; icon: string | null };
  auction_bids: { amount: number, profiles: { username: string | null } }[];
}

interface AuctionManagerProps {
  allItems: Item[];
  onUpdate: () => void;
}

const AuctionManager = ({ allItems, onUpdate }: AuctionManagerProps) => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAuctions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('auctions')
      .select('*, items(name, icon), auction_bids(amount, profiles!inner(username))')
      .order('created_at', { ascending: false });

    if (error) {
      showError("Impossible de charger les enchères.");
    } else {
      setAuctions(data as Auction[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAuctions();
  }, [fetchAuctions]);

  const getWinningBid = (bids: { amount: number, profiles: { username: string | null } }[]) => {
    if (!bids || bids.length === 0) return { amount: 0, username: 'N/A' };
    const winning = bids.reduce((max, bid) => bid.amount > max.amount ? bid : max, bids[0]);
    return { amount: winning.amount, username: winning.profiles?.username || 'Anonyme' };
  };

  return (
    <>
      <div className="flex flex-col h-full bg-gray-800/50 border border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-700 flex-shrink-0 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2"><Gavel /> Gestion des Enchères</h2>
          <Button onClick={() => setIsModalOpen(true)}>
            <PlusCircle className="w-4 h-4 mr-2" /> Créer une enchère
          </Button>
        </div>
        <div className="flex-grow overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-gray-800/80 sticky top-0 bg-gray-800/95 backdrop-blur-sm">
                  <TableHead>Objet</TableHead>
                  <TableHead>Fin le</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Gagnant / Offre max</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auctions.map(auction => {
                  const winningBid = getWinningBid(auction.auction_bids);
                  return (
                    <TableRow key={auction.id} className="border-gray-700">
                      <TableCell className="font-medium flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
                          <ItemIcon iconName={getPublicIconUrl(auction.items.icon)} alt={auction.items.name} />
                        </div>
                        <div>
                          {auction.items.name} x{auction.item_quantity}
                          <p className="text-xs text-gray-400 truncate max-w-xs">{auction.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(auction.ends_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${auction.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                          {auction.status === 'active' ? 'Active' : 'Terminée'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {auction.status === 'completed' ? `${winningBid.username} (${winningBid.amount} crédits)` : `${winningBid.amount} crédits`}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
      <AuctionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => {
          fetchAuctions();
          onUpdate();
        }}
        allItems={allItems}
      />
    </>
  );
};

export default AuctionManager;