import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Index from './pages/Index';
import { GameProvider } from './context/GameContext';
import { Toaster } from "@/components/ui/toaster";
import Login from './pages/Login';
import { useGame } from './context/GameContext';

const AppContent = () => {
  const { session, loading } = useGame();

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><div>Chargement...</div></div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={session ? <Index /> : <Login />} />
      </Routes>
    </Router>
  )
}

function App() {
  return (
    <GameProvider>
      <AppContent />
      <Toaster />
    </GameProvider>
  );
}

export default App;