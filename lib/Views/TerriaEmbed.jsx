import React, { useEffect, useRef } from "react";
import { mountTerria, unmountTerria } from "../../entry";

export function TerriaEmbed({ className, style }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    mountTerria(container).catch((error) => {
      console.error("Failed to mount Terria embed:", error);
    });

    return () => {
      unmountTerria();
    };
  }, []);

  return <div ref={containerRef} className={className} style={style} />;
}

export default TerriaEmbed;
