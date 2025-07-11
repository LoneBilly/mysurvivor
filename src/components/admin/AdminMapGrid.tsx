import React from 'react';
import AdminMapCell from './AdminMapCell';

// NOTE: J'ai supposé la structure de votre type 'Zone' et de vos props.
// Si ce n'est pas correct, n'hésitez pas à me le dire.
export interface Zone {
  id: number;
  x: number;
  y: number;
  type: string;
  icon: string | null;
}

interface AdminMapGridProps {
  grid: (Zone | null)[][];
  onCellDrop: (zone: Zone, x: number, y: number) => void;
  onCellClick: (zone: Zone | null, x: number, y: number) => void;
}

const AdminMapGrid: React.FC<AdminMapGridProps> = ({ grid, onCellDrop, onCellClick }) => {
  return (
    <div className="bg-gray-900/50 p-3 rounded-xl shadow-2xl border border-gray-700/50 overflow-x-auto">
      <div className="grid grid-cols-7 gap-1.5 w-full">
        {grid.map((row, y) =>
          row.map((cell, x) => (
            <AdminMapCell
              key={cell ? cell.id : `${x}-${y}`}
              zone={cell}
              x={x}
              y={y}
              onDrop={onCellDrop}
              onClick={() => onCellClick(cell, x, y)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AdminMapGrid;