import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert } from 'lucide-react';
import { showSuccess } from '@/utils/toast';

const BannedOverlay = () => {
  const { bannedInfo, signOut } = useAuth();
  const [isContesting, setIsContesting] = useState(false);
  const [contestMessage, setContestMessage] = useState('');

  if (!bannedInfo.isBanned) {
    return null;
  }

  const handleContest = () => {
    setIsContesting(true);
  };

  const handleSendContest = () => {
    // Pour l'instant, cette fonction ne fait rien côté serveur.
    console.log("Message de contestation:", contestMessage);
    showSuccess("Votre contestation a été envoyée. Nous l'examinerons bientôt.");
    signOut();
  };

  return (
    <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-md text-center bg-gray-900/80 border border-red-500/30 rounded-2xl p-8 shadow-2xl shadow-red-500/10">
        <ShieldAlert className="w-16 h-16 mx-auto text-red-400 mb-6" />
        <h1 className="text-4xl font-bold font-mono uppercase text-red-400">Banni</h1>
        
        {isContesting ? (
          <div className="mt-6 text-left">
            <p className="text-gray-300 mb-4">Veuillez expliquer pourquoi vous pensez que cette décision est une erreur.</p>
            <Textarea
              value={contestMessage}
              onChange={(e) => setContestMessage(e.target.value)}
              placeholder="Vos arguments ici..."
              className="bg-white/5 border-white/20 rounded-lg min-h-[120px]"
              rows={5}
            />
            <Button onClick={handleSendContest} className="w-full mt-4">
              Envoyer la contestation
            </Button>
          </div>
        ) : (
          <>
            <p className="text-gray-300 mt-4">
              Raison : {bannedInfo.reason || 'Aucune raison spécifiée.'}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Button onClick={signOut} variant="secondary" className="flex-1">
                Je comprends
              </Button>
              <Button onClick={handleContest} variant="destructive" className="flex-1">
                Je conteste
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BannedOverlay;