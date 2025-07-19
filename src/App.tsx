import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";

const IndexPage = lazy(() => import('./pages/Index'));
const AdminBidsPage = lazy(() => import('./pages/AdminBids'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Chargement...</div>}>
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="/admin/bids" element={<AdminBidsPage />} />
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;