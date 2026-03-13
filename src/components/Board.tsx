/**
 * NTXUVA – Board component
 *
 * Renders the 4-row board:
 *   Row 3  Computer defense  (outer / top)
 *   Row 2  Computer attack   (inner)
 *   ── divider ──────────────────
 *   Row 1  Human attack      (inner)
 *   Row 0  Human defense     (outer / bottom)
 */

import type { Board as BoardType, Move, Position } from '../types/GameTypes';
import { House } from './House';

interface BoardProps {
  board: BoardType;
  validMoves: Move[];
  highlighted: Position[];
  capturedCells: Position[];
  lastMoved: Position | null;
  busy: boolean;
  onHouseClick: (row: number, col: number) => void;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function matches(positions: ReadonlyArray<Position>, row: number, col: number): boolean {
  return positions.some(([r, c]) => r === row && c === col);
}

interface RowLabelProps {
  label: string;
  color: string;
}

function RowLabel({ label, color }: RowLabelProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '3px 0' }}>
      <div
        style={{ flex: 1, height: 1, background: `color-mix(in srgb, ${color} 30%, transparent)` }}
      />
      <span
        style={{
          color: `color-mix(in srgb, ${color} 55%, transparent)`,
          fontSize: 8,
          letterSpacing: '0.3em',
          whiteSpace: 'nowrap',
          fontFamily: 'monospace',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <div
        style={{ flex: 1, height: 1, background: `color-mix(in srgb, ${color} 30%, transparent)` }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Board
// ─────────────────────────────────────────────

export function Board({
  board,
  validMoves,
  highlighted,
  capturedCells,
  lastMoved,
  busy,
  onHouseClick,
}: BoardProps) {
  const cols = board[0].length;

  // Gap and min-house-size based on column count
  const gap = cols <= 8 ? 6 : cols <= 16 ? 4 : 3;
  const minHouse = cols <= 8 ? 32 : cols <= 16 ? 24 : 18;

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap,
    marginBottom: 4,
    minWidth: cols * (minHouse + gap),
  };

  const renderRow = (rowIndex: number, isComputer: boolean) => (
    <div style={gridStyle}>
      {board[rowIndex].map((pieces, col) => {
        const clickable =
          !busy && validMoves.some((m) => m.row === rowIndex && m.col === col);
        return (
          <House
            key={col}
            pieces={pieces}
            clickable={clickable}
            highlighted={matches(highlighted, rowIndex, col)}
            captured={matches(capturedCells, rowIndex, col)}
            lastMoved={
              lastMoved !== null &&
              lastMoved[0] === rowIndex &&
              lastMoved[1] === col
            }
            isComputer={isComputer}
            onClick={() => onHouseClick(rowIndex, col)}
          />
        );
      })}
    </div>
  );

  return (
    <div
      style={{
        background:
          'linear-gradient(180deg, #4a2208 0%, #6a3410 40%, #5a2c0e 70%, #4a2208 100%)',
        borderRadius: 18,
        border: '3px solid #7a4010',
        padding: '12px 14px',
        boxShadow:
          '0 10px 50px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,200,80,0.08)',
        overflowX: 'auto',
      }}
    >
      {/* Column numbers header */}
      <div style={{ ...gridStyle, marginBottom: 6 }}>
        {Array.from({ length: cols }, (_, i) => (
          <div
            key={i}
            style={{
              textAlign: 'center',
              color: 'rgba(212,160,32,0.3)',
              fontSize: 8,
              fontFamily: 'monospace',
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>

      {/* ── Computer side ─────────────────────────────────────── */}
      <RowLabel label="← Computador Defesa →" color="#e05030" />
      {renderRow(3, true)}

      <RowLabel label="← Computador Ataque →" color="#e05030" />
      {renderRow(2, true)}

      {/* ── Centre divider ────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          margin: '10px 0',
        }}
      >
        <div
          style={{
            flex: 1,
            height: 1,
            background:
              'linear-gradient(90deg, transparent, rgba(212,160,32,0.35), transparent)',
          }}
        />
        <span
          style={{
            color: 'rgba(212,160,32,0.4)',
            fontSize: 11,
            letterSpacing: '0.2em',
          }}
        >
          ◆ ◆ ◆
        </span>
        <div
          style={{
            flex: 1,
            height: 1,
            background:
              'linear-gradient(90deg, transparent, rgba(212,160,32,0.35), transparent)',
          }}
        />
      </div>

      {/* ── Human side ────────────────────────────────────────── */}
      <RowLabel label="← Você Ataque →" color="#d4a020" />
      {renderRow(1, false)}

      <RowLabel label="← Você Defesa →" color="#d4a020" />
      {renderRow(0, false)}
    </div>
  );
}
