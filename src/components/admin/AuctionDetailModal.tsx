import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';

interface Bid {
  amount: number;
  profiles: { username: string | null };
}

interface Auction {
  id: number;
  items: { name: string };
  auction_bids: Bid[];
}

interface AuctionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  auction: Auction | null;
}

type SortKey = 'username' | 'amount';

const AuctionDetailModal = ({ isOpen, onClose, auction }: AuctionDetailModalProps) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'amount', direction: 'desc' });

  const sortedBids = useMemo(() => {
    if (!auction) return [];
    return [...auction.auction_bids].sort((a, b) => {
      if (sortConfig.key === 'username') {
        const nameA = a.profiles?.username || 'zzz';
        const nameB = b.profiles?.username || 'zzz';
        if (nameA < nameB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (nameA > nameB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      } else { // amount
        return sortConfig.direction === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
    });
  }, [auction, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  if (!auction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full h-[70vh] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 flex flex-col">
        <DialogHeader>
          <DialogTitle>Offres pour : {auction.items.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto mt-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-gray-800/80 sticky top-0 bg-gray-800/95 backdrop-blur-sm">
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('username')}>
                    Joueur <ArrowUpDown className="w-4 h-4 ml-2" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('amount')}>
                    Montant <ArrowUpDown className="w-4 h-4 ml-2" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBids.map((bid, index) => (
                <TableRow key={index} className="border-gray-700">
                  <TableCell>{bid.profiles?.username || 'Anonyme'}</TableCell>
                  <TableCell>{bid.amount} crédits</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuctionDetailModal;