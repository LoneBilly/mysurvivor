import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, PlusCircle, Edit } from 'lucide-react';
import { Item } from '@/types/admin';
import AuctionFormModal from './AuctionFormModal';
import ItemIcon from '@/components/ItemIcon';
import { getPublicIconUrl } from '@/utils/imageUrls';
import { cn } from '@/lib/utils';

interface Auction {
  id: number;
  ends_at: string;
  item_id: number;
  item_quantity: number;
  status: 'active' | 'completed' | 'cancelled';
  items: { name: string; icon: string | null };
}

interface AuctionManagerProps {
  allItems: Item[];
}

const AuctionManager = ({ allItems }: AuctionManagerProps) => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAuction, setEditingAuction] = useState<Auction | null>(null);

  const fetchAuctions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('auctions')
      .select('*, items(name, icon)')
      .order('created_at', { ascending: false });
    
    if (error) console.error(error);
    else setAuctions(data as any[]);
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
      <div className="flex flex-col h-full bg-gray-800/50 border border-gray-700 rounded-lg">
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
                <TableHead>Quantité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Se termine le</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auctions.map(auction => (
                <TableRow key={auction.id} className="border-gray-700">
                  <TableCell className="font-medium flex items-center gap-2">
                    <div className="w-10 h-10 bg-slate-700/50 rounded-md flex items-center justify-center relative">
                      <ItemIcon iconName={getPublicIconUrl(auction.items.icon)} alt={auction.items.name} />
                    </div>
                    {auction.items.name}
                  </TableCell>
                  <TableCell>{auction.item_quantity}</TableCell>
                  <TableCell>
                    <span className={cn("px-2 py-1 text-xs font-semibold rounded-full border", getStatusBadge(auction.status))}>
                      {auction.status}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(auction.ends_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(auction)}>
                      <Edit className="w-4 h-4 mr-2" /> Modifier
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <AuctionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        auction={editingAuction}
        onSave={fetchAuctions}
        allItems={allItems}
      />
    </>
  );
};

export default AuctionManager;