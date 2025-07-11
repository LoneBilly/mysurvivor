import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, PlusCircle, CheckCircle, XCircle } from 'lucide-react';
import { showError } from '@/utils/toast';
import { Item } from '@/types/admin';
import ItemFormModal from './ItemFormModal';
import ItemIcon from '@/components/ItemIcon';
import { getCachedSignedUrl } from '@/utils/iconCache';

const ItemManager = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

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
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;
  }

  return (
    <>
      <div className="flex flex-col h-full bg-gray-800/50 border border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-700 flex-shrink-0 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher un objet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-900 border-gray-700 w-full"
            />
          </div>
          <Button onClick={handleCreate} className="w-full md:w-auto">
            <PlusCircle className="w-4 h-4 mr-2" />
            Créer un objet
          </Button>
        </div>
        <div className="flex-grow overflow-y-auto">
          {/* Desktop Header */}
          <div className="hidden md:grid grid-cols-[60px_1fr_2fr_100px] gap-4 px-4 py-2 border-b border-gray-700 font-semibold sticky top-0 bg-gray-800/95 backdrop-blur-sm">
            <div>Icône</div>
            <div>Nom</div>
            <div>Description</div>
            <div className="text-center">Empilable</div>
          </div>
          {/* Items List */}
          <div className="p-4 md:p-0 space-y-4 md:space-y-0">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="bg-gray-700/50 rounded-lg p-4 md:p-0 md:bg-transparent md:rounded-none md:grid md:grid-cols-[60px_1fr_2fr_100px] md:gap-4 md:px-4 md:py-3 items-center hover:bg-gray-800/60 cursor-pointer border-b border-gray-700/50"
                onClick={() => handleEdit(item)}
              >
                {/* Icon */}
                <div className="flex items-center gap-4 md:gap-0">
                  <div className="w-10 h-10 bg-slate-700/50 rounded-md flex items-center justify-center relative flex-shrink-0">
                    <ItemIcon iconName={item.signedIconUrl || item.icon} alt={item.name} />
                  </div>
                  <div className="font-medium md:hidden">{item.name}</div>
                </div>
                {/* Name (Desktop) */}
                <div className="hidden md:block font-medium truncate">{item.name}</div>
                {/* Description */}
                <div className="text-gray-400 text-sm my-2 md:my-0 truncate">
                  {item.description || <span className="italic">Aucune description</span>}
                </div>
                {/* Stackable */}
                <div className="flex justify-between items-center text-sm md:justify-center">
                  <span className="md:hidden text-gray-300">Empilable:</span>
                  {item.stackable ? 
                    <CheckCircle className="w-5 h-5 text-green-400" /> : 
                    <XCircle className="w-5 h-5 text-red-400" />
                  }
                </div>
              </div>
            ))}
          </div>
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