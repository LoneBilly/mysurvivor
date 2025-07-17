import React from 'react';

export const ConstructionInfoPanel = ({ coords, grid, isMobile }: { coords: {x: number, y: number}, grid: any[][], isMobile: boolean }) => {
    const cell = grid[coords.y][coords.x];
    if (!cell) return null;
    
    const building = cell.construction || cell.job;
    if (!building) return null;

    const buildingDef = cell.construction ? {name: cell.construction.type} : {name: cell.job.type};

    return (
        <div className="absolute p-2 bg-gray-800 text-white rounded-md shadow-lg text-xs pointer-events-none" style={{ left: `${(coords.x / 11) * 100 + 2}%`, top: `${(coords.y / 11) * 100 + 2}%`}}>
            <p className="font-bold capitalize">{buildingDef.name}</p>
            <p>Coordonnées: ({coords.x}, {coords.y})</p>
        </div>
    );
};