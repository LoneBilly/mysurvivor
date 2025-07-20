import { useDraggable } from "@dnd-kit/core";
import React from "react";

export function DraggableItem(props: {
  id: string;
  children: React.ReactNode;
  data?: Record<string, any>;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: props.id,
    data: props.data,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
        cursor: 'grabbing',
      }
    : {
        cursor: 'grab',
    };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {props.children}
    </div>
  );
}