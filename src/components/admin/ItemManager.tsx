import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { PlusCircle, Edit, Trash2, Search } from 'lucide-react';

type Item = {
  id: number;
  name: string;
  description: string;
  icon: string;
  type: string;
};

const ItemManager = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('items').select('id, name, description, icon, type').order('name', { ascending: true });
      if (error) {
        toast.error("Erreur lors du chargement des items.");
      } else if (data) {
        setItems(data);
      }
      setLoading(false);
    };
    fetchItems();
  }, []);

  const filteredItems = useMemo(() => {
    return items
      .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .filter(item => typeFilter === 'All' || item.type === typeFilter);
  }, [items, searchQuery, typeFilter]);

  return (
    <div className="p-4 md:p-6 bg-gray-900 text-white min-h-screen">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Gestion des Items</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Nouvel Item
        </Button>
      </header>

      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher par nom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border-gray-700 pl-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full sm:w-[180px] bg-gray-900 border-gray-700 px-3 h-10 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="All">Tous les types</option>
            <option value="Nourriture">Nourriture</option>
            <option value="Armure">Armure</option>
            <option value="Sac à dos">Sac à dos</option>
            <option value="Items divers">Items divers</option>
            <option value="Blueprint">Blueprints</option>
            <option value="Outil">Outil</option>
            <option value="Arme">Arme</option>
            <option value="Vehicule">Vehicule</option>
            <option value="Chaussures">Chaussures</option>
            <option value="Ressource">Ressource</option>
            <option value="Composant">Composant</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">Chargement...</div>
      ) : (
        <div className="overflow-x-auto bg-gray-800 rounded-lg">
          <table className="w-full text-left">
            <thead className="bg-gray-700">
              <tr>
                <th className="p-4">Icon</th>
                <th className="p-4">Nom</th>
                <th className="p-4">Type</th>
                <th className="p-4">Description</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="p-4">
                    <img src={item.icon ? `/icons/items/${item.icon}` : '/placeholder.svg'} alt={item.name} className="w-10 h-10 object-contain bg-gray-600 rounded" />
                  </td>
                  <td className="p-4 font-medium">{item.name}</td>
                  <td className="p-4"><span className="px-2 py-1 bg-gray-600 rounded-full text-xs">{item.type}</span></td>
                  <td className="p-4 text-sm text-gray-400 max-w-xs truncate" title={item.description}>{item.description}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ItemManager;