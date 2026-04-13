import { reactive } from "vue";

import type { ModalPosition } from "@/types";

interface Size {
  width: number;
  height: number;
}

interface DraggableOptions {
  initialPosition?: ModalPosition;
  initialSize?: Size;
  minWidth?: number;
  minHeight?: number;
}

export function useDraggable(options: DraggableOptions = {}) {
  const position = reactive<ModalPosition>({
    x: options.initialPosition?.x ?? 100,
    y: options.initialPosition?.y ?? 100,
  });

  const size = reactive<Size>({
    width: options.initialSize?.width ?? 400,
    height: options.initialSize?.height ?? 150,
  });

  const minWidth = options.minWidth ?? 200;
  const minHeight = options.minHeight ?? 150;

  let isDragging = false;
  let isResizing = false;
  let dragOffset = { x: 0, y: 0 };

  function startDrag(event: MouseEvent) {
    const target = event.target as Element;
    if (
      target.closest(".resize-handle") ||
      target.closest("select") ||
      target.closest("input")
    ) {
      return;
    }

    isDragging = true;
    dragOffset = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };

    document.addEventListener("mousemove", handleDrag);
    document.addEventListener("mouseup", stopDrag);
  }

  function handleDrag(event: MouseEvent) {
    if (isDragging) {
      position.x = event.clientX - dragOffset.x;
      position.y = event.clientY - dragOffset.y;
    }
  }

  function stopDrag() {
    isDragging = false;
    document.removeEventListener("mousemove", handleDrag);
    document.removeEventListener("mouseup", stopDrag);
  }

  function startResize(event: MouseEvent) {
    isResizing = true;
    event.preventDefault();
    document.addEventListener("mousemove", handleResize);
    document.addEventListener("mouseup", stopResize);
  }

  function handleResize(event: MouseEvent) {
    if (isResizing) {
      size.width = Math.max(minWidth, event.clientX - position.x);
      size.height = Math.max(minHeight, event.clientY - position.y);
    }
  }

  function stopResize() {
    isResizing = false;
    document.removeEventListener("mousemove", handleResize);
    document.removeEventListener("mouseup", stopResize);
  }

  function cleanup() {
    document.removeEventListener("mousemove", handleDrag);
    document.removeEventListener("mouseup", stopDrag);
    document.removeEventListener("mousemove", handleResize);
    document.removeEventListener("mouseup", stopResize);
  }

  return {
    position,
    size,
    startDrag,
    startResize,
    cleanup,
  };
}
