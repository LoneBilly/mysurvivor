import { useEffect, useState } from 'react';
import { Biohazard } from 'lucide-react';

interface LoadingScreenProps {
  message: string;
}

const LoadingScreen = ({ message }: LoadingScreenProps) => {
  const [displayedMessage, setDisplayedMessage] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  // Typing effect for the message
  useEffect(() => {
    setDisplayedMessage('');
    let i = 0;
    const intervalId = setInterval(() => {
      if (i < message.length) {
        setDisplayedMessage(prev => prev + message.charAt(i));
        i++;
      } else {
        clearInterval(intervalId);
      }
    }, 30);

    return () => clearInterval(intervalId);
  }, [message]);

  // Blinking cursor effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 text-green-400 font-mono p-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-75"></div>
      <div className="scanline"></div>

      <div className="text-center z-10">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <Biohazard className="w-full h-full text-green-400 animate-pulse-strong" style={{ animationDelay: '0.2s' }} />
          <div className="absolute inset-0 border-2 border-green-400 rounded-full animate-ping-slow"></div>
          <div className="absolute inset-0 border border-green-400/50 rounded-full animate-ping-slower" style={{ animationDelay: '0.5s' }}></div>
        </div>

        <h1 className="text-2xl md:text-3xl mb-4 glitch" data-text="INITIALISATION...">
          INITIALISATION...
        </h1>
        <div className="h-6 text-lg text-cyan-300">
          <span>&gt; {displayedMessage}</span>
          <span className={`inline-block w-2 h-5 bg-cyan-300 ml-1 transition-opacity duration-100 ${showCursor ? 'opacity-100' : 'opacity-0'}`}></span>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;