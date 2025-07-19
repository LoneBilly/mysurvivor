import { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface Bid {
  auction_id: number;
  item_name: string;
  bid_id: number;
  player_username: string;
  amount: number;
  created_at: string;
}

export default function AdminBids() {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <h1 className="text-2xl font-bold mb-4">Admin - Historique des Enchères</h1>
      <Card>
        <CardHeader>
          <CardTitle>Toutes les enchères</CardTitle>
          <CardDescription>
            Liste de toutes les enchères placées par les joueurs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 bg-red-100 p-4 rounded-md">Erreur: {error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
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
                    <TableRow key={bid.bid_id}>
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
        </CardContent>
      </Card>
    </div>
  );
}