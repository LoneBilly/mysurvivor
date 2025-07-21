import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building, Flame, GitBranch, Layers, Map, Package, Book, Users as UsersIcon, ShieldCheck } from "lucide-react"

// NOTE: I'm assuming the content for these tabs are components that are either
// in this file or imported. For simplicity, I've used placeholders.
const AdminMap = () => <div className="p-4"><h2 className="text-2xl font-bold">Gestion de la carte</h2></div>
const AdminItems = () => <div className="p-4"><h2 className="text-2xl font-bold">Gestion des objets</h2></div>
const AdminRecipes = () => <div className="p-4"><h2 className="text-2xl font-bold">Gestion des recettes</h2></div>
const AdminUsers = () => <div className="p-4"><h2 className="text-2xl font-bold">Gestion des joueurs</h2></div>
const AdminPatchnotes = () => <div className="p-4"><h2 className="text-2xl font-bold">Gestion des Patchnotes</h2></div>
const BuildingDefinitionsAdmin = () => <div className="p-4"><h3 className="text-xl font-bold">Définitions des bâtiments</h3></div>
const BuildingLevelsAdmin = () => <div className="p-4"><h3 className="text-xl font-bold">Niveaux des bâtiments</h3></div>
const CampfireAdmin = () => <div className="p-4"><h3 className="text-xl font-bold">Configuration du Feu de camp</h3></div>

const Admin = () => {
  return (
    <Tabs defaultValue="map" className="flex flex-col h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4">
          <TabsList className="flex-wrap h-auto py-2">
            <TabsTrigger value="map"><Map className="w-4 h-4 mr-2" />Carte</TabsTrigger>
            <TabsTrigger value="items"><Package className="w-4 h-4 mr-2" />Objets</TabsTrigger>
            <TabsTrigger value="recipes"><Book className="w-4 h-4 mr-2" />Recettes</TabsTrigger>
            <TabsTrigger value="users"><UsersIcon className="w-4 h-4 mr-2" />Joueurs</TabsTrigger>
            <TabsTrigger value="batiments"><Building className="w-4 h-4 mr-2" />Bâtiments</TabsTrigger>
            <TabsTrigger value="patchnotes"><GitBranch className="w-4 h-4 mr-2" />Patchnotes</TabsTrigger>
          </TabsList>
        </div>
      </div>
      <TabsContent value="map" className="flex-1 overflow-auto">
        <AdminMap />
      </TabsContent>
      <TabsContent value="items" className="flex-1 overflow-auto">
        <AdminItems />
      </TabsContent>
      <TabsContent value="recipes" className="flex-1 overflow-auto">
        <AdminRecipes />
      </TabsContent>
      <TabsContent value="users" className="flex-1 overflow-auto">
        <AdminUsers />
      </TabsContent>
      <TabsContent value="batiments" className="flex-1 flex flex-col min-h-0">
        <Tabs defaultValue="definitions" className="flex-1 flex flex-col">
          <div className="px-4 border-b">
            <TabsList>
              <TabsTrigger value="definitions"><Building className="w-4 h-4 mr-2" />Définitions</TabsTrigger>
              <TabsTrigger value="levels"><Layers className="w-4 h-4 mr-2" />Niveaux</TabsTrigger>
              <TabsTrigger value="campfire"><Flame className="w-4 h-4 mr-2" />Feu de camp</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="definitions" className="flex-1 overflow-auto">
            <BuildingDefinitionsAdmin />
          </TabsContent>
          <TabsContent value="levels" className="flex-1 overflow-auto">
            <BuildingLevelsAdmin />
          </TabsContent>
          <TabsContent value="campfire" className="flex-1 overflow-auto">
            <CampfireAdmin />
          </TabsContent>
        </Tabs>
      </TabsContent>
      <TabsContent value="patchnotes" className="flex-1 overflow-auto">
        <AdminPatchnotes />
      </TabsContent>
    </Tabs>
  )
}

export default Admin;