"use client";

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import IndexPage from './pages/Index';
import GameFooter from './components/GameFooter';

function App() {
  const handleOpenInventory = () => {
    console.log("Opening inventory...");
    // In a real application, this would open your inventory modal or navigate to the inventory page.
  };

  const handlePurchaseCredits = () => {
    console.log("Purchasing credits...");
    // In a real application, this would initiate your credit purchase flow.
  };

  return (
    <Router>
      <div className="relative min-h-screen flex flex-col">
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<IndexPage />} />
            {/* Add other routes here */}
          </Routes>
        </main>
        <GameFooter
          onOpenInventory={handleOpenInventory}
          onPurchaseCredits={handlePurchaseCredits}
        />
      </div>
    </Router>
  );
}

export default App;