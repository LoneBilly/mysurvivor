// ... existing code ...

const AdminMapGrid = ({ mapLayout, onMapUpdate, onZoneSelect }: AdminMapGridProps) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [centerY, setCenterY] = useState(0);

  useEffect(() => {
    if (gridRef.current) {
      const grid = gridRef.current;
      const gridHeight = grid.scrollHeight;
      const gridTop = grid.offsetTop;
      const viewportHeight = window.innerHeight;
      const offset = (gridHeight - viewportHeight) / 2;
      setCenterY(offset);
    }
  }, [mapLayout]);

  // ... existing code ...

  return (
    <div className="bg-gray-900/50 p-3 rounded-xl shadow-2xl border border-gray-700/50 aspect-square max-w-full max-h-full relative overflow-hidden">
      <div
        ref={gridRef}
        className="grid grid-cols-7 gap-1.5 w-full h-full"
        style={{ transform: `translateY(${centerY}px)` }}
      >
        {grid.map((row, y) =>
          row.map((cell, x) =>
            cell ? (
              <DraggableMapCell key={cell.id} cell={cell} onDrop={handleDrop} onSelect={onZoneSelect} />
            ) : (
              <div key={`${x}-${y}`} className="aspect-square rounded-md" />
            )
          )
        )}
      </div>
    </div>
  );
};

// ... existing code ...