import React from 'react';
import { Button } from '@/components/ui/button';
import styles from './LaserButton.module.css';

interface LaserButtonProps extends React.ComponentProps<typeof Button> {
  buttonClassName?: string; // Pour les styles appliqués directement au composant Button
}

const LaserButton: React.FC<LaserButtonProps> = ({ children, className, buttonClassName, ...props }) => {
  return (
    <div className={`${styles.laserButtonContainer} ${className || ''}`}>
      <Button {...props} className={`${styles.laserButtonContent} ${buttonClassName || ''}`}>
        {children}
      </Button>
    </div>
  );
};

export default LaserButton;