import { Hammer, Home, Box, Flame, Cog } from 'lucide-react';
import { useMemo } from 'react';
import { Card } from '@/components/ui/card';

const getIcon = (type) => {
    switch (type) {
        case 'campfire': return <Flame className="w-8 h-8 text-orange-400" />;
        case 'workbench': return <Hammer className="w-8 h-8 text-gray-400" />;
        case 'chest': return <Box className="w-8 h-8 text-yellow-700" />;
        case 'foundation': return <div className="w-full h-full bg-slate-700/50 border-2 border-dashed border-slate-600 rounded-md" />;
        default: return <Home className="w-8 h-8 text-gray-500" />;
    }
};

export function Base({ constructions, craftingJobs, onConstructionClick, onFoundationClick }) {
    const activeJobWorkbenches = useMemo(() => 
        new Set(craftingJobs?.map(job => job.workbench_id) || []),
        [craftingJobs]
    );

    const grid = useMemo(() => {
        if (!constructions || constructions.length === 0) {
            return { cells: [], minX: 0, minY: 0, width: 1, height: 1 };
        }
        const coords = constructions.map(c => ({ x: c.x, y: c.y }));
        const minX = Math.min(...coords.map(c => c.x));
        const maxX = Math.max(...coords.map(c => c.x));
        const minY = Math.min(...coords.map(c => c.y));
        const maxY = Math.max(...coords.map(c => c.y));

        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        const cells = Array(width * height).fill(null);

        constructions.forEach(c => {
            const x = c.x - minX;
            const y = c.y - minY;
            cells[y * width + x] = c;
        });

        return { cells, minX, minY, width, height };
    }, [constructions]);

    return (
        <div className="p-4 bg-slate-800/50 rounded-lg">
            <h2 className="text-xl font-bold text-white mb-4">Votre Base</h2>
            <div 
                className="grid gap-2"
                style={{
                    gridTemplateColumns: `repeat(${grid.width + 2}, minmax(0, 1fr))`,
                }}
            >
                {Array.from({ length: (grid.width + 2) * (grid.height + 2) }).map((_, index) => {
                    const gridX = index % (grid.width + 2);
                    const gridY = Math.floor(index / (grid.width + 2));
                    const x = gridX - 1 + grid.minX;
                    const y = gridY - 1 + grid.minY;
                    
                    const construction = constructions.find(c => c.x === x && c.y === y);

                    if (construction) {
                        const isCrafting = construction.type === 'workbench' && activeJobWorkbenches.has(construction.id);
                        return (
                            <Card 
                                key={`${x}-${y}`}
                                className={`relative aspect-square flex items-center justify-center cursor-pointer transition-all
                                    ${isCrafting ? 'bg-yellow-900/50 border-yellow-500 animate-pulse' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}
                                `}
                                onClick={() => onConstructionClick(construction)}
                            >
                                {getIcon(construction.type)}
                                {isCrafting && <Cog className="absolute top-1 right-1 w-4 h-4 text-yellow-400 animate-spin-slow" />}
                            </Card>
                        );
                    }

                    const isAdjacent = constructions.some(c => Math.abs(c.x - x) + Math.abs(c.y - y) === 1);
                    if (isAdjacent) {
                        return (
                            <Card 
                                key={`${x}-${y}`}
                                className="aspect-square flex items-center justify-center cursor-pointer bg-slate-800 border-slate-700 hover:bg-slate-700"
                                onClick={() => onFoundationClick(x, y)}
                            >
                                <div className="w-full h-full border-2 border-dashed border-slate-600 rounded-md" />
                            </Card>
                        );
                    }

                    return <div key={`${x}-${y}`} className="aspect-square" />;
                })}
            </div>
        </div>
    );
}