/**
 * NTXUVA – Controls component
 * Board-size selector, difficulty selector, sound toggle, and reset button.
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
    background: active ? 'rgba(212,160,32,0.22)' : 'rgba(212,160,32,0.06)',
    border: `1px solid ${active ? 'rgba(212,160,32,0.7)' : 'rgba(212,160,32,0.2)'}`,
    borderRadius: 6,
    color: active ? '#d4a020' : '#7a5025',
    padding: '5px 11px',
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
  soundEnabled: boolean;
  onDifficultyChange: (d: Difficulty) => void;
  onColsChange: (c: ColCount) => void;
  onReset: () => void;
  onToggleSound: () => void;
}

const DIFFICULTIES: ReadonlyArray<[Difficulty, string]> = [
  ['easy',   'Fácil'],
  ['medium', 'Médio'],
  ['hard',   'Difícil'],
];

const COL_OPTIONS: ReadonlyArray<[ColCount, string]> = [
  [7,  '7'],
  [16, '16'],
  [22, '22'],
];

const labelStyle: CSSProperties = {
  color: '#7a5025',
  fontSize: 11,
  letterSpacing: '0.1em',
  flexShrink: 0,
};

const btnBase: CSSProperties = {
  borderRadius: 8,
  padding: '6px 14px',
  fontSize: 11,
  cursor: 'pointer',
  letterSpacing: '0.1em',
  fontWeight: 'bold',
  transition: 'all 0.2s',
  fontFamily: 'inherit',
};

export function Controls({
  difficulty,
  cols,
  soundEnabled,
  onDifficultyChange,
  onColsChange,
  onReset,
  onToggleSound,
}: ControlsProps) {
  return (
    <div
      style={{
        marginTop: 32,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Board size */}
      <div style={{ display: 'flex',justifyContent: "center" ,flexDirection: "column" ,alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={labelStyle}>CASAS:</span>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={labelStyle}>IA:</span>
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

      {/* Sound + Reset */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Sound toggle */}
        <button
          onClick={onToggleSound}
          title={soundEnabled ? 'Desligar som' : 'Ligar som'}
          style={{
            ...btnBase,
            background: soundEnabled
              ? 'rgba(212,160,32,0.14)'
              : 'rgba(212,160,32,0.05)',
            border: `1px solid ${soundEnabled ? 'rgba(212,160,32,0.5)' : 'rgba(212,160,32,0.2)'}`,
            color: soundEnabled ? '#d4a020' : '#5a4015',
            padding: '6px 10px',
            fontSize: 15,
          }}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>

        {/* Reset */}
        <button
          onClick={onReset}
          style={{
            ...btnBase,
            background: 'rgba(212,160,32,0.1)',
            border: '1px solid rgba(212,160,32,0.3)',
            color: '#d4a020',
          }}
        >
          ↺ REINICIAR
        </button>
      </div>
    </div>
  );
}
