import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, PlusCircle, Edit, Trash2, Trophy } from 'lucide-react';
import { Item } from '@/types/admin';
import AuctionFormModal from './AuctionFormModal';
import ItemIcon from '@/components/ItemIcon';
import { getPublicIconUrl } from '@/utils/imageUrls';
import { cn } from '@/lib/utils';
import ActionModal from '../ActionModal';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface Auction {
  id: number;
  ends_at: string;
  item_id: number;
  item_quantity: number;
  status: 'active' | 'completed' | 'cancelled';
  items: { name: string; icon: string | null };
}

interface TopBidder {
  username: string;
  total_bid: number;
}

interface AuctionManagerProps {
  allItems: Item[];
}

const AuctionManager = ({ allItems }: AuctionManagerProps) => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [topBidders, setTopBidders] = useState<TopBidder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAuction, setEditingAuction] = useState<Auction | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; auction: Auction | null }>({ isOpen: false, auction: null });

  const fetchAuctions = useCallback(async () => {
    setLoading(true);
    const [auctionsRes, biddersRes] = await Promise.all([
      supabase.from('auctions').select('*, items(name, icon)').order('created_at', { ascending: false }),
      supabase.rpc('get_top_bidders')
    ]);
    
    if (auctionsRes.error) console.error(auctionsRes.error);
    else setAuctions(auctionsRes.data as any[]);

    if (biddersRes.error) console.error(biddersRes.error);
    else setTopBidders(biddersRes.data || []);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAuctions();
  }, [fetchAuctions]);

  const handleCreate = () => {
    setEditingAuction(null);
    setIsModalOpen(true);
  };

  const handleEdit = (auction: Auction) => {
    setEditingAuction(auction);
    setIsModalOpen(true);
  };

  const handleDelete = (auction: Auction) => {
    setDeleteModal({ isOpen: true, auction });
  };

  const confirmDelete = async () => {
    if (!deleteModal.auction) return;
    const { error } = await supabase.from('auctions').delete().eq('id', deleteModal.auction.id);
    if (error) showError("Erreur de suppression.");
    else {
      showSuccess("Enchère supprimée.");
      fetchAuctions();
    }
    setDeleteModal({ isOpen: false, auction: null });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'completed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        <div className="lg:col-span-2 flex flex-col h-full bg-gray-800/50 border border-gray-700 rounded-lg">
          <div className="p-4 border-b border-gray-700 flex justify-end">
            <Button onClick={handleCreate}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Créer une enchère
            </Button>
          </div>
          <div className="flex-grow overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-gray-800/80 sticky top-0 bg-gray-800/95 backdrop-blur-sm">
                  <TableHead>Objet</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Se termine le</TableHead>
                  <TableHead className="w-[180px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auctions.map(auction => (
                  <TableRow key={auction.id} className="border-gray-700">
                    <TableCell className="font-medium flex items-center gap-2">
                      <div className="w-10 h-10 bg-slate-700/50 rounded-md flex items-center justify-center relative">
                        <ItemIcon iconName={getPublicIconUrl(auction.items.icon)} alt={auction.items.name} />
                      </div>
                      {auction.items.name} x{auction.item_quantity}
                    </TableCell>
                    <TableCell>
                      <span className={cn("px-2 py-1 text-xs font-semibold rounded-full border", getStatusBadge(auction.status))}>
                        {auction.status}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(auction.ends_at).toLocaleString()}</TableCell>
                    <TableCell className="space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(auction)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(auction)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <Card className="h-full flex flex-col bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-400" />Top Enchérisseurs</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-y-auto">
            {topBidders.length > 0 ? (
              <ol className="space-y-2">
                {topBidders.map((bidder, index) => (
                  <li key={index} className="flex justify-between items-center p-2 bg-gray-900/50 rounded-md">
                    <span className="font-semibold">{index + 1}. {bidder.username}</span>
                    <span className="font-mono text-yellow-400">{bidder.total_bid} crédits</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-gray-400 text-center pt-8">Aucune enchère placée pour le moment.</p>
            )}
          </CardContent>
        </Card>
      </div>
      <AuctionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        auction={editingAuction}
        onSave={fetchAuctions}
        allItems={allItems}
      />
      <ActionModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, auction: null })}
        title="Supprimer l'enchère"
        description={`Êtes-vous sûr de vouloir supprimer cette enchère pour "${deleteModal.auction?.items.name}" ?`}
        actions={[
          { label: "Supprimer", onClick: confirmDelete, variant: "destructive" },
          { label: "Annuler", onClick: () => setDeleteModal({ isOpen: false, auction: null }), variant: "secondary" },
        ]}
      />
    </>
  );
};

export default AuctionManager;