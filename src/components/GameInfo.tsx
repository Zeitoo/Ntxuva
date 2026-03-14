/**
 * NTXUVA – GameInfo component
 * Scoreboard (with per-player phase badges), status message, and move log.
 */

import type { GameStatus, Player } from '../types/GameTypes';

interface PhaseBadgeProps {
  phase: 1 | 2;
  isHuman: boolean;
}

function PhaseBadge({ phase, isHuman }: PhaseBadgeProps) {
  const color = isHuman ? '#d4a020' : '#e05030';
  const label = phase === 1 ? 'FASE 1' : 'FASE 2';
  const tip   = phase === 1
    ? 'Obrigatório jogar de casa com >1 peça'
    : 'Livre para jogar de qualquer casa com peça';

  return (
    <div
      title={tip}
      style={{
        display: 'inline-block',
        background: `rgba(${isHuman ? '212,160,32' : '224,80,40'},0.12)`,
        border: `1px solid rgba(${isHuman ? '212,160,32' : '224,80,40'},0.35)`,
        borderRadius: 10,
        padding: '2px 8px',
        fontSize: 9,
        fontWeight: 'bold',
        color,
        letterSpacing: '0.15em',
        cursor: 'help',
      }}
    >
      {label}
    </div>
  );
}

interface GameInfoProps {
  turn: Player;
  status: GameStatus;
  message: string;
  humanPieces: number;
  compPieces: number;
  capturedByHuman: number;
  capturedByComputer: number;
  humanPhase: 1 | 2;
  compPhase: 1 | 2;
  moveLog: string[];
}

export function GameInfo({
  turn,
  status,
  message,
  humanPieces,
  compPieces,
  capturedByHuman,
  capturedByComputer,
  humanPhase,
  compPhase,
  moveLog,
}: GameInfoProps) {
  return (
    <>
      {/* ── Scoreboard ───────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 10,
          marginBottom: 12,
          alignItems: 'center',
        }}
      >
        {/* Computer */}
        <div
          style={{
            background: 'rgba(224,80,40,0.08)',
            border: '1px solid rgba(224,80,40,0.2)',
            borderRadius: 10,
            padding: '10px 14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 15 }}>🤖</span>
            <span style={{ color: '#e05030', fontSize: 12, fontWeight: 'bold', letterSpacing: '0.05em' }}>
              COMPUTADOR
            </span>
          </div>
          <PhaseBadge phase={compPhase} isHuman={false} />
          <div style={{ color: '#a04020', fontSize: 11, marginTop: 4 }}>
            {compPieces} peças &nbsp;·&nbsp; {capturedByComputer} cap.
          </div>
        </div>

        {/* Centre: turn indicator */}
        <div style={{ textAlign: 'center', padding: '0 4px' }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              margin: '0 auto',
              background: turn === 1 ? '#f0c040' : '#e06040',
              boxShadow: `0 0 12px ${
                turn === 1 ? 'rgba(240,192,64,0.9)' : 'rgba(224,96,64,0.9)'
              }`,
              transition: 'all 0.3s',
            }}
          />
          <div
            style={{
              marginTop: 5,
              fontSize: 8,
              color: 'rgba(212,160,32,0.4)',
              letterSpacing: '0.15em',
              whiteSpace: 'nowrap',
            }}
          >
            {turn === 1 ? 'SEU TURNO' : 'DELE'}
          </div>
        </div>

        {/* Human */}
        <div
          style={{
            background: 'rgba(212,160,32,0.08)',
            border: '1px solid rgba(212,160,32,0.2)',
            borderRadius: 10,
            padding: '10px 14px',
            textAlign: 'right',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 6,
              marginBottom: 4,
            }}
          >
            <span style={{ color: '#d4a020', fontSize: 12, fontWeight: 'bold', letterSpacing: '0.05em' }}>
              VOCÊ
            </span>
            <span style={{ fontSize: 15 }}>👤</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <PhaseBadge phase={humanPhase} isHuman={true} />
          </div>
          <div style={{ color: '#a07030', fontSize: 11, marginTop: 4 }}>
            {humanPieces} peças &nbsp;·&nbsp; {capturedByHuman} cap.
          </div>
        </div>
      </div>

      {/* ── Status message ───────────────────────────────── */}
      <div
        style={{
          textAlign: 'center',
          padding: '11px 16px',
          margin: '10px 0',
          background:
            status !== 'playing' ? 'rgba(212,160,32,0.15)' : 'rgba(212,160,32,0.07)',
          border: `1px solid ${
            status !== 'playing' ? 'rgba(212,160,32,0.45)' : 'rgba(212,160,32,0.18)'
          }`,
          borderRadius: 10,
          color: '#d4a020',
          fontSize: status !== 'playing' ? 17 : 13,
          fontWeight: status !== 'playing' ? 'bold' : 'normal',
          minHeight: 42,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s',
        }}
      >
        {message}
      </div>

      {/* ── Move log ─────────────────────────────────────── */}
      <div
        style={{
          background: 'rgba(0,0,0,0.2)',
          border: '1px solid rgba(212,160,32,0.1)',
          borderRadius: 10,
          padding: '8px 12px',
          marginTop: 8,
        }}
      >
        <div style={{ color: '#7a5025', fontSize: 10, letterSpacing: '0.2em', marginBottom: 5 }}>
          HISTÓRICO
        </div>
        {moveLog.length === 0 ? (
          <div style={{ color: '#4a3015', fontSize: 11, fontStyle: 'italic' }}>
            Nenhuma jogada ainda…
          </div>
        ) : (
          moveLog.map((entry, i) => (
            <div
              key={i}
              style={{ color: i === 0 ? '#a07030' : '#4a3015', fontSize: 11, marginBottom: 2 }}
            >
              {entry}
            </div>
          ))
        )}
      </div>
    </>
  );
}
