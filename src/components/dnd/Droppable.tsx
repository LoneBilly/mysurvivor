import { useDroppable } from "@dnd-kit/core";
import React from "react";

export function Droppable(props: {
  id: string;
  children: React.ReactNode;
  className?: string;
  data?: Record<string, any>;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: props.id,
    data: props.data,
  });

  const style: React.CSSProperties = {
    outline: isOver ? "2px solid #4ade80" : undefined,
    outlineOffset: '2px',
    borderRadius: '0.375rem'
  };

  return (
    <div ref={setNodeRef} style={style} className={props.className}>
      {props.children}
    </div>
  );
}