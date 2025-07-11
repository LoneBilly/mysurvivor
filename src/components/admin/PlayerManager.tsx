// ... existing code ...

const sortedPlayers = useMemo(() => {
  const filteredPlayers = players.filter(p =>
    (p.username?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return [...filteredPlayers].sort((a, b) => {
    if (sortConfig.key === 'username') {
      const nameA = a.username || '';
      const nameB = b.username || '';
      return sortConfig.direction === 'asc'
        ? nameA.localeCompare(nameB, undefined, { sensitivity: 'base' })
        : nameB.localeCompare(nameA, undefined, { sensitivity: 'base' });
    } else { // created_at
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      if (dateA < dateB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (dateA > dateB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    }
  });
}, [players, searchTerm, sortConfig]);

// ... existing code ...