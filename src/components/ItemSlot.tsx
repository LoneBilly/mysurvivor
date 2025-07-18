"use client";

import React from 'react';
import { cn } from '@/lib/utils'; // Assuming cn utility is available here

interface ItemSlotProps {
  item?: {
    name: string;
    icon?: string;
    type?: string;
  };
  quantity?: number;
  className?: string;
}

const ItemSlot: React.FC<ItemSlotProps> = ({ item, quantity, className }) => {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center p-2 border rounded-md bg-gray-50 dark:bg-gray-800",
        "w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32", // Fixed size for slots
        "flex-shrink-0", // Prevent shrinking
        "text-center",
        className
      )}
    >
      {item ? (
        <>
          {item.icon && (
            <img
              src={item.icon}
              alt={item.name}
              className="w-12 h-12 sm:w-16 sm:h-16 object-contain mb-1"
            />
          )}
          <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 break-words text-wrap">
            {item.name}
          </p>
          {quantity && quantity > 1 && (
            <span className="absolute bottom-1 right-1 bg-blue-500 text-white text-xs px-1 rounded-full">
              x{quantity}
            </span>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">Vide</p>
      )}
    </div>
  );
};

export default ItemSlot;