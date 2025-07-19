import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

interface Bid {
  auction_id: number;
  item_name: string;
  bid_id: number;
  player_username: string;
  amount: number;
  created_at: string;
}

interface AuctionBidsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuctionBidsModal = ({ isOpen, onClose }: AuctionBidsModalProps) => {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchBids = async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_all_auction_bids');

        if (error) {
          console.error('Error fetching auction bids:', error);
          setError(error.message);
          setBids([]);
        } else {
          setBids(data || []);
          setError(null);
        }
        setLoading(false);
      };

      fetchBids();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[80vh] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-4 sm:p-6 flex flex-col">
        <DialogHeader>
          <DialogTitle>Historique des Enchères</DialogTitle>
          <DialogDescription>Liste de toutes les enchères placées par les joueurs.</DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto mt-4">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-red-500 bg-red-900/50 p-4 rounded-md">Erreur: {error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-gray-800/80 sticky top-0 bg-gray-800/95 backdrop-blur-sm">
                  <TableHead>ID Enchère</TableHead>
                  <TableHead>Objet</TableHead>
                  <TableHead>Joueur</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bids.length > 0 ? (
                  bids.map((bid) => (
                    <TableRow key={bid.bid_id} className="border-gray-700">
                      <TableCell>{bid.auction_id}</TableCell>
                      <TableCell>{bid.item_name}</TableCell>
                      <TableCell>{bid.player_username}</TableCell>
                      <TableCell>{bid.amount} Crédits</TableCell>
                      <TableCell>{new Date(bid.created_at).toLocaleString('fr-FR')}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Aucune enchère trouvée.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuctionBidsModal;