import React from 'react';

interface ResourceHeaderProps {
  wood: number;
  metal: number;
  components: number;
}

const ResourceHeader: React.FC<ResourceHeaderProps> = ({ wood, metal, components }) => {
  return (
    <header className="w-full bg-gray-800 p-4 flex justify-between items-center">
      <div className="text-white text-lg">
        <span className="mr-4">Bois: {wood}</span>
        <span className="mr-4">Métal: {metal}</span>
        <span>Composants: {components}</span>
      </div>
    </header>
  );
};

export default ResourceHeader;