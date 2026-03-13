/**
 * NTXUVA – House component
 *
 * Renders a single circular house on the board.
 * Displays seed dots up to 16 and always shows the numeric count.
 */

import { useState, type CSSProperties } from 'react';

// ─────────────────────────────────────────────
// Seed grid (visual inside each house)
// ─────────────────────────────────────────────

interface SeedGridProps {
  count: number;
  isComputer: boolean;
}

function SeedGrid({ count, isComputer }: SeedGridProps) {
  const shown = Math.min(count, 16);
  const size = shown <= 4 ? 9 : shown <= 9 ? 7 : 5;
  const color = isComputer
    ? 'radial-gradient(circle at 35% 30%, #e8986a, #a04828)'
    : 'radial-gradient(circle at 35% 30%, #f0d070, #c88820)';

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        alignItems: 'center',
        justifyContent: 'center',
        width: '75%',
        height: '75%',
      }}
    >
      {Array.from({ length: shown }, (_, i) => (
        <div
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: color,
            boxShadow:
              '0 1px 2px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// House
// ─────────────────────────────────────────────

export interface HouseProps {
  pieces: number;
  clickable: boolean;
  highlighted: boolean;
  captured: boolean;
  lastMoved: boolean;
  isComputer: boolean;
  onClick: () => void;
}

export function House({
  pieces,
  clickable,
  highlighted,
  captured,
  lastMoved,
  isComputer,
  onClick,
}: HouseProps) {
  const [hovered, setHovered] = useState(false);

  // ── Visual state resolution ──────────────────────────────────────────
  let borderColor: string;
  let bgGradient: string;
  let shadow: string;

  if (captured) {
    bgGradient = 'radial-gradient(circle at 40% 35%, #5a1010, #200808)';
    borderColor = '#e03030';
    shadow = '0 0 16px rgba(224,48,48,0.7), inset 0 2px 6px rgba(0,0,0,0.6)';
  } else if (highlighted) {
    bgGradient = 'radial-gradient(circle at 40% 35%, #5a3818, #2a1808)';
    borderColor = '#f0c040';
    shadow = '0 0 18px rgba(240,192,64,0.6), inset 0 2px 4px rgba(0,0,0,0.4)';
  } else if (lastMoved) {
    bgGradient = 'radial-gradient(circle at 40% 35%, #183818, #081408)';
    borderColor = '#40d060';
    shadow = '0 0 12px rgba(64,208,96,0.4), inset 0 2px 6px rgba(0,0,0,0.5)';
  } else if (clickable && hovered) {
    bgGradient = 'radial-gradient(circle at 40% 35%, #4a2c10, #200e04)';
    borderColor = '#d4a020';
    shadow = '0 0 14px rgba(212,160,32,0.5), inset 0 2px 4px rgba(0,0,0,0.3)';
  } else if (clickable) {
    bgGradient = 'radial-gradient(circle at 40% 35%, #3a2010, #180a04)';
    borderColor = 'rgba(212,160,32,0.6)';
    shadow = '0 0 8px rgba(212,160,32,0.25), inset 0 2px 6px rgba(0,0,0,0.4)';
  } else {
    bgGradient = 'radial-gradient(circle at 40% 35%, #251508, #0e0704)';
    borderColor = isComputer ? '#2a1208' : '#1a0c06';
    shadow = 'inset 0 2px 8px rgba(0,0,0,0.6)';
  }

  const style: CSSProperties = {
    width: '100%',
    aspectRatio: '1',
    borderRadius: '50%',
    background: bgGradient,
    border: `2px solid ${borderColor}`,
    boxShadow: shadow,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    cursor: clickable ? 'pointer' : 'default',
    transition: 'all 0.18s ease',
    transform:
      clickable && hovered
        ? 'scale(1.07)'
        : clickable
          ? 'scale(1.02)'
          : 'scale(1)',
    userSelect: 'none',
    minWidth: 20,
    minHeight: 20,
  };

  return (
    <div
      style={style}
      onClick={clickable ? onClick : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${pieces} peça${pieces !== 1 ? 's' : ''}`}
    >
      {pieces > 0 && <SeedGrid count={pieces} isComputer={isComputer} />}
      <div
        style={{
          position: 'absolute',
          bottom: 2,
          right: 3,
          fontSize: 8,
          color:
            pieces > 0
              ? 'rgba(255,255,255,0.55)'
              : 'rgba(255,255,255,0.15)',
          fontWeight: 'bold',
          lineHeight: 1,
          fontFamily: 'monospace',
        }}
      >
        {pieces}
      </div>
    </div>
  );
}
