import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search, PlusCircle, Check, X } from 'lucide-react';
import { showError } from '@/utils/toast';
import { Item } from '@/types/admin';
import ItemFormModal from './ItemFormModal';
import ItemIcon from '@/components/ItemIcon';
import { getCachedSignedUrl } from '@/utils/iconCache';
import { useIsMobile } from '@/hooks/use-is-mobile';

const ItemManager = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const isMobile = useIsMobile();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('items').select('*').order('name', { ascending: true });
    if (error) {
      showError("Impossible de charger les objets.");
      console.error(error);
      setItems([]);
    } else {
      const itemsWithUrls = await Promise.all(
        (data as Item[]).map(async (item) => {
          if (item.icon && item.icon.includes('.')) {
            const signedUrl = await getCachedSignedUrl(item.icon);
            return { ...item, signedIconUrl: signedUrl || undefined };
          }
          return item;
        })
      );
      setItems(itemsWithUrls);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    fetchItems();
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (typeFilter === 'all' || item.type === typeFilter)
  );

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;
  }

  return (
    <>
      <div className="flex flex-col h-full bg-gray-800/50 border border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-700 flex-shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher un objet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-900 border-gray-700"
              />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="native-select w-full sm:w-[180px] bg-gray-900 border-gray-700">
              <option value="all">Tous les types</option>
              <option value="Ressources">Ressources</option>
              <option value="Armes">Armes</option>
              <option value="Nourriture">Nourriture</option>
              <option value="Soins">Soins</option>
              <option value="Items divers">Items divers</option>
              <option value="Items craftés">Items craftés</option>
            </select>
          </div>
          <Button onClick={handleCreate} className="w-full sm:w-auto">
            <PlusCircle className="w-4 h-4 mr-2" />
            Créer un objet
          </Button>
        </div>
        <div className="flex-grow overflow-y-auto">
          {isMobile ? (
            <div className="p-4 space-y-3">
              {filteredItems.map(item => (
                <div key={item.id} onClick={() => handleEdit(item)} className="bg-gray-800/60 p-3 rounded-lg border border-gray-700 cursor-pointer flex items-start gap-4">
                  <div className="w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
                    <ItemIcon iconName={item.signedIconUrl || item.icon} alt={item.name} />
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="font-bold text-white truncate">{item.name}</p>
                    <p className="text-sm text-gray-400 truncate mt-1">{item.description || 'Aucune description'}</p>
                    <div className="flex items-center justify-between text-xs text-gray-300 mt-2">
                      <div className="flex items-center gap-2">
                        {item.stackable ? <Check className="w-4 h-4 text-green-400" /> : <X className="w-4 h-4 text-red-400" />}
                        <span>{item.stackable ? 'Empilable' : 'Non empilable'}</span>
                      </div>
                      <span className="bg-gray-700 text-gray-300 text-xs font-medium px-2 py-0.5 rounded-full">{item.type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="hover:bg-gray-800/80 sticky top-0 bg-gray-800/95 backdrop-blur-sm">
                  <TableHead className="w-[80px]">Icône</TableHead>
                  <TableHead className="w-[200px]">Nom</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[150px]">Type</TableHead>
                  <TableHead className="w-[120px] text-center">Empilable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map(item => (
                  <TableRow
                    key={item.id}
                    className="border-gray-700 hover:bg-gray-800/60 cursor-pointer"
                    onClick={() => handleEdit(item)}
                  >
                    <TableCell>
                      <div className="w-10 h-10 bg-slate-700/50 rounded-md flex items-center justify-center relative">
                        <ItemIcon iconName={item.signedIconUrl || item.icon} alt={item.name} />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium truncate">{item.name}</TableCell>
                    <TableCell className="text-gray-400 truncate">{item.description}</TableCell>
                    <TableCell>
                      <span className="bg-gray-700 text-gray-300 text-xs font-medium px-2 py-1 rounded-full">{item.type}</span>
                    </TableCell>
                    <TableCell className="text-center">{item.stackable ? 'Oui' : 'Non'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
      <ItemFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={editingItem}
        onSave={handleSave}
      />
    </>
  );
};

export default ItemManager;