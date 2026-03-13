/**
 * NTXUVA – Controls component
 *
 * Renders the board-size selector, difficulty selector, and reset button.
 * Designed to be generic: OptionButton is reusable for any string/number enum.
 */

import type { CSSProperties } from 'react';
import type { ColCount, Difficulty } from '../types/GameTypes';

// ─────────────────────────────────────────────
// Generic option button
// ─────────────────────────────────────────────

interface OptionButtonProps<T extends string | number> {
  value: T;
  current: T;
  label: string;
  onChange: (v: T) => void;
}

function OptionButton<T extends string | number>({
  value,
  current,
  label,
  onChange,
}: OptionButtonProps<T>) {
  const active = value === current;

  const style: CSSProperties = {
    background: active
      ? 'rgba(212,160,32,0.22)'
      : 'rgba(212,160,32,0.06)',
    border: `1px solid ${
      active ? 'rgba(212,160,32,0.7)' : 'rgba(212,160,32,0.2)'
    }`,
    borderRadius: 6,
    color: active ? '#d4a020' : '#7a5025',
    padding: '6px 12px',
    fontSize: 11,
    cursor: 'pointer',
    letterSpacing: '0.08em',
    fontWeight: active ? 'bold' : 'normal',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
  };

  return (
    <button style={style} onClick={() => onChange(value)}>
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────
// Controls
// ─────────────────────────────────────────────

interface ControlsProps {
  difficulty: Difficulty;
  cols: ColCount;
  onDifficultyChange: (d: Difficulty) => void;
  onColsChange: (c: ColCount) => void;
  onReset: () => void;
}

const DIFFICULTIES: ReadonlyArray<[Difficulty, string]> = [
  ['easy', 'Fácil'],
  ['medium', 'Médio'],
  ['hard', 'Difícil'],
];

const COL_OPTIONS: ReadonlyArray<[ColCount, string]> = [
  [7, '7'],
  [16, '16'],
  [22, '22'],
];

const sectionLabel: CSSProperties = {
  color: '#7a5025',
  fontSize: 11,
  letterSpacing: '0.1em',
  flexShrink: 0,
};

export function Controls({
  difficulty,
  cols,
  onDifficultyChange,
  onColsChange,
  onReset,
}: ControlsProps) {
  return (
    <div
      style={{
        marginTop: 12,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Board size */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
      >
        <span style={sectionLabel}>CASAS:</span>
        {COL_OPTIONS.map(([c, label]) => (
          <OptionButton<ColCount>
            key={c}
            value={c}
            current={cols}
            label={label}
            onChange={onColsChange}
          />
        ))}
      </div>

      {/* Difficulty */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
      >
        <span style={sectionLabel}>IA:</span>
        {DIFFICULTIES.map(([d, label]) => (
          <OptionButton<Difficulty>
            key={d}
            value={d}
            current={difficulty}
            label={label}
            onChange={onDifficultyChange}
          />
        ))}
      </div>

      {/* Reset */}
      <button
        onClick={onReset}
        style={{
          background: 'rgba(212,160,32,0.1)',
          border: '1px solid rgba(212,160,32,0.3)',
          borderRadius: 8,
          color: '#d4a020',
          padding: '7px 18px',
          fontSize: 12,
          cursor: 'pointer',
          letterSpacing: '0.12em',
          fontWeight: 'bold',
          transition: 'all 0.2s',
          fontFamily: 'inherit',
        }}
      >
        ↺ REINICIAR
      </button>
    </div>
  );
}
