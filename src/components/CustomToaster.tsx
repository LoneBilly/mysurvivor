import { Toaster, ToasterProps } from '@/components/ui/sonner';
import React from 'react';

interface CustomToasterProps extends ToasterProps {
  // Propriétés supplémentaires si nécessaire
}

const CustomToaster: React.FC<CustomToasterProps> = (props) => {
  // Fonction pour empêcher la propagation des clics sur les toasts
  const handleToastClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div onClick={handleToastClick} className="pointer-events-auto">
      <Toaster
        {...props}
        className={`z-[9999] ${props.className || ''}`}
        toastOptions={{
          ...props.toastOptions,
          classNames: {
            toast: 'bg-slate-900/90 backdrop-blur-sm text-white border-slate-700/50 shadow-2xl pointer-events-auto',
            title: 'text-sm font-semibold',
            description: 'text-xs',
            closeButton: 'absolute right-2.5 top-2.5 rounded-md p-1 text-white/50 opacity-80 hover:opacity-100 hover:text-white focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50 transition-opacity',
            ...props.toastOptions?.classNames,
          },
        }}
      />
    </div>
  );
};

export default CustomToaster;