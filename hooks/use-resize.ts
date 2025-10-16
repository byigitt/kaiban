import * as React from "react";

export function useResize(initialWidth: number) {
  const [width, setWidth] = React.useState(initialWidth);
  const lastWidthRef = React.useRef(initialWidth);
  const [isResizing, setIsResizing] = React.useState(false);

  const handleMouseDown = React.useCallback(() => {
    setIsResizing(true);
  }, []);

  React.useEffect(() => {
    if (!isResizing) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const newWidth = window.innerWidth - event.clientX;
      if (newWidth >= 320 && newWidth <= 800) {
        lastWidthRef.current = newWidth;
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const toggleCollapse = React.useCallback((collapsed: boolean) => {
    if (collapsed) {
      setWidth(0);
      return;
    }

    setWidth((currentWidth) => {
      if (currentWidth === 0) {
        return lastWidthRef.current;
      }

      lastWidthRef.current = currentWidth;
      return currentWidth;
    });
  }, []);

  return { width, isResizing, handleMouseDown, toggleCollapse, lastWidthRef };
}
