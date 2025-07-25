import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Item } from '@/types/game';
import { showSuccess, showError } from '@/utils/toast';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from 'lucide-react';
import ItemFormModal from './ItemFormModal';
import { getPublicIconUrl } from '@/utils/imageUrls';

const ItemManager = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('items').select('*').order('name', { ascending: true });
    if (error) {
      showError("Erreur lors de la récupération des objets.");
      console.error(error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const handleSave = (savedItem?: Item) => {
    if (savedItem) {
      const index = items.findIndex(i => i.id === savedItem.id);
      if (index !== -1) {
        // Update
        const newItems = [...items];
        newItems[index] = savedItem;
        setItems(newItems);
      } else {
        // Create
        setItems([...items, savedItem].sort((a, b) => a.name.localeCompare(b.name)));
      }
    } else {
      // Delete
      if (selectedItem) {
        setItems(items.filter(i => i.id !== selectedItem.id));
      }
    }
    setSelectedItem(null);
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [items, searchTerm, typeFilter]);

  const openModal = (item: Item | null = null) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 text-white">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Gestion des Objets</h1>
        <Button onClick={() => openModal()} className="flex items-center gap-2">
          <PlusCircle className="w-5 h-5" />
          Créer un objet
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <Input
          type="text"
          placeholder="Rechercher un objet..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-auto flex-grow bg-gray-900 border-gray-700"
        />
        <div className="flex gap-4">
          <div className="relative w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full sm:w-[180px] bg-gray-900 border-gray-700 px-3 h-10 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">Tous les types</option>
              <option value="Ressources">Ressources</option>
              <option value="Armes">Armes</option>
              <option value="Armure">Armure</option>
              <option value="Sac à dos">Sac à dos</option>
              <option value="Chaussures">Chaussures</option>
              <option value="Vehicule">Vehicule</option>
              <option value="Nourriture">Nourriture</option>
              <option value="Soins">Soins</option>
              <option value="Outils">Outils</option>
              <option value="Équipements">Équipements</option>
              <option value="Items divers">Items divers</option>
              <option value="Blueprint">Blueprint</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredItems.map(item => (
            <div
              key={item.id}
              onClick={() => openModal(item)}
              className="bg-slate-800/50 p-3 rounded-lg cursor-pointer hover:bg-slate-700/70 transition-colors flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 mb-2 bg-slate-900/50 rounded-md flex items-center justify-center">
                {item.icon ? (
                  <img src={getPublicIconUrl(item.icon)} alt={item.name} className="w-12 h-12 object-contain" />
                ) : (
                  <span className="text-gray-500 text-xs">Pas d'icône</span>
                )}
              </div>
              <p className="font-semibold text-sm">{item.name}</p>
              <p className="text-xs text-gray-400">{item.type}</p>
            </div>
          ))}
        </div>
      )}

      <ItemFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={selectedItem}
        onSave={handleSave}
        allItems={items}
      />
    </div>
  );
};

export default ItemManager;