import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle, Gavel, Trash2 } from 'lucide-react';
import { Item } from '@/types/admin';
import { showError, showSuccess } from '@/utils/toast';
import AuctionFormModal from './AuctionFormModal';
import { getPublicIconUrl } from '@/utils/imageUrls';
import ItemIcon from '../ItemIcon';
import { useIsMobile } from '@/hooks/use-is-mobile';
import AuctionBidsModal from './AuctionBidsModal';
import ActionModal from '../ActionModal';

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
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isBidsModalOpen, setIsBidsModalOpen] = useState(false);
  const [actionModal, setActionModal] = useState<{ isOpen: boolean; onConfirm: () => void; title: string; description: string; variant?: "default" | "destructive" }>({ isOpen: false, onConfirm: () => {}, title: '', description: '' });
  const isMobile = useIsMobile();

  const fetchAuctions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('auctions')
      .select('*, items(name, icon), auction_bids(amount, profiles(username))')
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

  const handleDeleteAuction = (auction: Auction) => {
    setActionModal({
      isOpen: true,
      title: "Confirmer la suppression",
      description: `Êtes-vous sûr de vouloir supprimer l'enchère pour "${auction.items.name} x${auction.item_quantity}" ? Toutes les enchères placées seront remboursées.`,
      variant: "destructive",
      onConfirm: async () => {
        setLoading(true);
        const { error } = await supabase.rpc('admin_delete_auction', { p_auction_id: auction.id });
        if (error) {
          showError(error.message);
        } else {
          showSuccess("Enchère supprimée et enchères remboursées.");
          fetchAuctions();
        }
        setLoading(false);
        setActionModal({ isOpen: false, onConfirm: () => {}, title: '', description: '' });
      }
    });
  };

  return (
    <>
      <div className="flex flex-col h-full bg-gray-800/50 border border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-700 flex-shrink-0 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Gavel /> Gestion des Enchères</h2>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <Button onClick={() => setIsBidsModalOpen(true)} variant="outline" className="w-full">
              Voir l'historique
            </Button>
            <Button onClick={() => setIsFormModalOpen(true)} className="w-full">
              <PlusCircle className="w-4 h-4 mr-2" /> Créer une enchère
            </Button>
          </div>
        </div>
        <div className="flex-grow overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>
          ) : isMobile ? (
            <div className="p-4 space-y-3">
              {auctions.map(auction => {
                const winningBid = getWinningBid(auction.auction_bids);
                return (
                  <Card key={auction.id} className="bg-gray-800/60 border-gray-700">
                    <CardHeader className="p-3 flex flex-row items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
                          <ItemIcon iconName={getPublicIconUrl(auction.items.icon)} alt={auction.items.name} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{auction.items.name} x{auction.item_quantity}</CardTitle>
                          <p className="text-xs text-gray-400 truncate max-w-[200px]">{auction.description}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteAuction(auction)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">Statut: </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${auction.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                          {auction.status === 'active' ? 'Active' : 'Terminée'}
                        </span>
                      </div>
                      <div><span className="text-gray-400">Fin le: </span>{new Date(auction.ends_at).toLocaleString('fr-FR')}</div>
                      <div><span className="text-gray-400">Offre max: </span>{winningBid.amount} crédits ({winningBid.username})</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-gray-800/80 sticky top-0 bg-gray-800/95 backdrop-blur-sm">
                  <TableHead>Objet</TableHead>
                  <TableHead>Fin le</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Gagnant / Offre max</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
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
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteAuction(auction)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
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
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={() => {
          fetchAuctions();
          onUpdate();
        }}
        allItems={allItems}
      />
      <AuctionBidsModal
        isOpen={isBidsModalOpen}
        onClose={() => setIsBidsModalOpen(false)}
      />
      <ActionModal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ ...actionModal, isOpen: false })}
        title={actionModal.title}
        description={actionModal.description}
        actions={[
          { label: "Confirmer", onClick: actionModal.onConfirm, variant: actionModal.variant },
          { label: "Annuler", onClick: () => setActionModal({ ...actionModal, isOpen: false }), variant: "secondary" },
        ]}
      />
    </>
  );
};

export default AuctionManager;