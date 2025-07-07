import {
  TreePine, Waves, Building2, Mountain, HelpCircle,
  Warehouse, Museum, Factory, Users, Hospital, Subway,
  Carrot, Fuel, Shield, Home, Library, CaseSensitive,
  Bunker, Pill, Church, Shirt, Castle, Disc, Bot,
  Bank, Beef, FerrisWheel, Car, ShoppingCart
} from 'lucide-react';

interface ZoneIconProps {
  type: string;
  className?: string;
}

const ZoneIcon = ({ type, className }: ZoneIconProps) => {
  const iconProps = { className: className || "w-6 h-6" };

  switch (type) {
    case 'foret': return <TreePine {...iconProps} />;
    case 'plage': return <Waves {...iconProps} />;
    case 'Rivière': return <Waves {...iconProps} />;
    case 'Mine':
    case 'Grotte': return <Mountain {...iconProps} />;
    
    // Urban & specific buildings
    case 'Parking souterrain': return <Car {...iconProps} />;
    case 'Entrepôt portuaire': return <Warehouse {...iconProps} />;
    case 'Musée': return <Museum {...iconProps} />;
    case 'Zone industrielle': return <Factory {...iconProps} />;
    case 'Camp de survivants': return <Users {...iconProps} />;
    case 'Hôpital': return <Hospital {...iconProps} />;
    case 'Métro': return <Subway {...iconProps} />;
    case 'Ferme': return <Carrot {...iconProps} />;
    case 'Station-service': return <Fuel {...iconProps} />;
    case 'Base militaire': return <Shield {...iconProps} />;
    case 'Quartier résidentiel': return <Home {...iconProps} />;
    case 'Bibliothèque': return <Library {...iconProps} />;
    case 'Commissariat de police': return <CaseSensitive {...iconProps} />;
    case 'Bunker': return <Bunker {...iconProps} />;
    case 'Pharmacie': return <Pill {...iconProps} />;
    case 'Église': return <Church {...iconProps} />;
    case 'Magasin de vêtements': return <Shirt {...iconProps} />;
    case 'Ruine': return <Castle {...iconProps} />;
    case 'Boite de nuit': return <Disc {...iconProps} />;
    case 'Usine désaffectée': return <Bot {...iconProps} />;
    case 'Banque': return <Bank {...iconProps} />;
    case 'Abattoir': return <Beef {...iconProps} />;
    case "Parc d'attraction": return <FerrisWheel {...iconProps} />;
    case 'Concession automobile': return <Car {...iconProps} />;
    case 'Supermarché': return <ShoppingCart {...iconProps} />;

    // Generic urban
    case 'urban': return <Building2 {...iconProps} />;

    default: return <HelpCircle {...iconProps} />;
  }
};

export default ZoneIcon;