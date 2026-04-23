import type { CSSProperties } from 'react';

export function getResponsiveLogoStyle(width: number): CSSProperties {
  return {
    width: `min(${width}px, 60vw)`,
  };
}
