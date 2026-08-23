import { useRef, useState, type DragEvent } from "react";

import type { DragNode } from "../custom-collection";

export interface TreeDrag {
  draggingId: string | null;
  overId: string | null;
  propsFor: (node: DragNode) => {
    draggable: true;
    onDragStart: (event: DragEvent) => void;
    onDragOver: (event: DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (event: DragEvent) => void;
    onDragEnd: () => void;
  };
}

export function useTreeDrag(onMove: (dragged: DragNode, target: DragNode) => void): TreeDrag {
  const carried = useRef<DragNode | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const rest = () => {
    carried.current = null;
    setDraggingId(null);
    setOverId(null);
  };

  return {
    draggingId,
    overId,
    propsFor: (node: DragNode) => ({
      draggable: true,
      onDragStart: (event: DragEvent) => {
        event.stopPropagation();
        carried.current = node;
        setDraggingId(node.id);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", node.id);
      },
      onDragOver: (event: DragEvent) => {
        const from = carried.current;

        if (!from || from.id === node.id) return;

        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "move";
        setOverId(node.id);
      },
      onDragLeave: () => setOverId((current) => (current === node.id ? null : current)),
      onDrop: (event: DragEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const from = carried.current;

        if (from && from.id !== node.id) onMove(from, node);

        rest();
      },
      onDragEnd: rest
    })
  };
}
